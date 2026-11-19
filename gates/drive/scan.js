// gates/drive/scan.js - drives the board scan's steps on the bundle under test: the New Game sheet's upload button fed a
// picture, the scan's answer DOUBLED at the one seam the deployed bridge uses (window.CTCloud._scanBoard, see gate 28's
// header for why that is honest and where it stops), then Check the board, the two questions, and Play or Analyze.
// (batch 13, jobs/scan-check-the-board-first-then-who-moves-and-which-side-then-play-or-analyze-2026-11-18.)
//
//   const S=require('../drive/scan');
//   await S.scan(b,{fen});                          // sign in, stub both readings with one answer, feed a picture
//   await S.scan(b,{seq:[asShot,turned]});          // the two readings answered separately (a {reject:{code,message}} entry rejects)
//   const c=await S.check(b);                       // {step,title,line,board:{x,y,w,h},bottomLeft,squares:{e4:'white pawn',...},placement}
//   await S.tapSquare(b,'e5'); await S.pick(b,'Empty square');   // fix one square
//   await S.next(b); await S.answer(b,'turn','Black'); await S.answer(b,'side','White');
//   await S.start(b,'Play');                        // or 'Analyze'; returns 'ok', 'disabled' or 'absent'
//   await S.through(b,{fen,turn:'w',side:'w',kind:'Play'});      // the whole route, for a gate that only needs the game
//
// EVERYTHING IS FOUND BY WHAT IT SAYS - the dialog by its name, a square and a piece button by their aria-label, a question
// by its words, Play and Analyze by their words - so no reading here depends on a data-ct hook the scan job added
// (CLAUDE.md, #432: a check that reads only what the fix added cannot see the defect the fix removes).
'use strict';
const zlib=require('zlib');
const P=require('./play');
function png8(asym){
  const w=8,h=8,raw=Buffer.alloc((w*3+1)*h);
  for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;for(let x=0;x<w;x++){const o=y*(w*3+1)+1+x*3;const v=((x+y)%2)?0xee:0x22;raw[o]=v;raw[o+1]=v;raw[o+2]=v;if(asym&&y<2){raw[o]=0xff;raw[o+1]=0;raw[o+2]=0;}}}
  const T=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);T[n]=c>>>0;}
  const crc=(buf)=>{let c=0xffffffff;for(let i=0;i<buf.length;i++)c=T[(c^buf[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);const td=Buffer.concat([Buffer.from(type,'ascii'),data]);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc(td),0);return Buffer.concat([len,td,cr]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const signIn=(b)=>b.page.evaluate(()=>{const C=window.CTCloud;if(!C||!C._emit)return false;C._emit({uid:'gate-uid',name:'Gate',email:'gate@example.test',photo:null});return true;});
// the two readings of one photo: call 0 is the picture as shot, call 1 the picture turned 180 degrees
// (a launch with pro:true replaces CTCloud with the harness's own stand-in, which has no facade: there the facade's one line -
// scanBoard delegates to _scanBoard, index.html - is put on the stand-in, so the double still enters by _scanBoard)
const stub=(b,seq)=>b.page.evaluate((seq)=>{const C=window.CTCloud;window.__scan={calls:0};
  if(window.__ctProStub)C.scanBoard=function(img){return this._scanBoard?this._scanBoard(img):Promise.reject(new Error('cloud-not-ready'));};
  C._scanBoard=function(){const i=window.__scan.calls++;const p=seq[Math.min(i,seq.length-1)];
    return p&&p.reject?Promise.reject(Object.assign(new Error(p.reject.message||''),{code:p.reject.code})):Promise.resolve(p);};return true;},seq);
async function scan(b,o){
  await P.states['setup'](b);await b.settle(200);
  await signIn(b);await b.settle(250);
  const seq=o.seq||[Object.assign({ok:true,fen:o.fen},o.orientation?{orientation:o.orientation}:{})];
  await stub(b,seq);
  await b.page.locator('input[type=file]').nth(1).setInputFiles({name:'board.png',mimeType:'image/png',buffer:png8(!!o.asym)});
  await b.settle(o.wait==null?1100:o.wait);
}
// which side the camera was on, when the two readings disagree: found by its words
async function cameraSide(b,side){await b.page.locator('button',{hasText:new RegExp('^'+side+"'s side$")}).first().click();await b.settle(500);}
const DLG='[role="dialog"][aria-label="Check the board"],[role="dialog"][aria-label^="Who moves next"]';
// the screen as painted: its title and line by their place (the first two text rows), the board by the 8x8 grid inside
// the dialog, each square by its aria-label ("e4, white pawn"), the orientation by which square is PAINTED bottom-left
const check=(b)=>b.page.evaluate((DLG)=>{const d=document.querySelector(DLG);if(!d)return null;const r0=d.getBoundingClientRect();if(!(r0.width>0&&r0.height>0))return null;
  const grid=[...d.querySelectorAll('div')].find(x=>/repeat\(8,/.test(x.style.gridTemplateColumns||''));const g=grid?grid.getBoundingClientRect():null;
  const squares={};let bl=null,blKey=null;
  if(grid)for(const s of grid.children){const m=/^([a-h][1-8]), (.+)$/.exec(s.getAttribute('aria-label')||'');if(!m)continue;squares[m[1]]=m[2];const r=s.getBoundingClientRect();const k=Math.round(r.left)-Math.round(r.top)*1000;if(blKey===null||k<blKey){blKey=k;bl=m[1];}}
  const L={king:'k',queen:'q',rook:'r',bishop:'b',knight:'n',pawn:'p'};let pl='';
  for(let rk=8;rk>=1;rk--){let e=0;for(const f of 'abcdefgh'){const v=squares[f+rk];const m=v&&/^(white|black) (\w+)$/.exec(v);if(m){if(e){pl+=e;e=0;}pl+=m[1]==='white'?L[m[2]].toUpperCase():L[m[2]];}else e++;}if(e)pl+=e;if(rk>1)pl+='/';}
  const st=d.querySelector('[role="status"]');
  const txt=(d.innerText||'').split('\n').map(x=>x.trim()).filter(Boolean);
  return {step:/^Check the board$/.test(d.getAttribute('aria-label')||'')?1:2,title:txt[0]||'',line:st?(st.innerText||'').replace(/\s+/g,' ').trim():null,
    lineBox:st?(()=>{const r=st.getBoundingClientRect();return {y:Math.round(r.top*10)/10,h:Math.round(r.height*10)/10,sh:st.scrollHeight,ch:st.clientHeight};})():null,
    board:g?{x:Math.round(g.left*100)/100,y:Math.round(g.top*100)/100,w:Math.round(g.width*100)/100,h:Math.round(g.height*100)/100}:null,bottomLeft:bl,squares,count:Object.keys(squares).length,placement:pl,
    text:(d.innerText||'').replace(/\s+/g,' ').trim(),vw:window.innerWidth,vh:window.innerHeight,bottom:Math.round(Math.max(...[...d.querySelectorAll('button')].map(x=>x.getBoundingClientRect().bottom))*10)/10};},DLG);
const tapSquare=async(b,sq)=>{await b.page.locator('[role="dialog"] [aria-label^="'+sq+', "]').first().click();await b.settle(200);};
// a piece button by its name: 'white king' ... 'black pawn', or 'Empty square'
const pick=async(b,name)=>{await b.page.locator('[role="dialog"] button[aria-label="'+name+'"]').first().click();await b.settle(200);};
const btn=(b,name)=>b.page.evaluate(([DLG,name])=>{const d=document.querySelector(DLG);if(!d)return null;
  const x=[...d.querySelectorAll('button')].find(e=>(e.getAttribute('aria-label')||'')===name||(e.innerText||'').trim()===name);if(!x)return null;const r=x.getBoundingClientRect();
  return {dis:!!x.disabled,pressed:x.getAttribute('aria-pressed'),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,words:(x.innerText||'').trim(),icons:x.querySelectorAll('svg').length};},[DLG,name]);
const tapBtn=async(b,name)=>{const st=await b.page.evaluate(([DLG,name])=>{const d=document.querySelector(DLG);if(!d)return 'absent';
  const x=[...d.querySelectorAll('button')].find(e=>(e.getAttribute('aria-label')||'')===name||(e.innerText||'').trim()===name);if(!x)return 'absent';if(x.disabled)return 'disabled';x.click();return 'ok';},[DLG,name]);await b.settle(300);return st;};
const next=(b)=>tapBtn(b,'The board is right');
// a question's answer, the question found by its words: which='turn' is "Who moves next?", 'side' is "Which side are you?"
const Q={turn:'Who moves next?',side:'Which side are you?'};
const answer=async(b,which,colour)=>{const st=await b.page.evaluate(([DLG,q,colour])=>{const d=document.querySelector(DLG);if(!d)return 'absent';
  const g=[...d.querySelectorAll('[role="group"]')].find(e=>(e.getAttribute('aria-label')||'')===q&&(e.innerText||'').indexOf(q)>=0);if(!g)return 'no question';
  const x=[...g.querySelectorAll('button')].find(e=>(e.innerText||'').trim()===colour);if(!x)return 'no answer';x.click();return 'ok';},[DLG,Q[which],colour]);await b.settle(200);return st;};
const answered=(b,which)=>b.page.evaluate(([DLG,q])=>{const d=document.querySelector(DLG);if(!d)return null;
  const g=[...d.querySelectorAll('[role="group"]')].find(e=>(e.getAttribute('aria-label')||'')===q&&(e.innerText||'').indexOf(q)>=0);if(!g)return null;
  const r=g.getBoundingClientRect();if(!(r.width>0&&r.height>0))return null;
  const on=[...g.querySelectorAll('button')].filter(e=>e.getAttribute('aria-pressed')==='true').map(e=>(e.innerText||'').trim());return {painted:true,on};},[DLG,Q[which]]);
const start=(b,kind)=>tapBtn(b,kind);
// the whole route for a gate that only needs the game: the scan, the board accepted as read, both questions, the start
async function through(b,o){
  await scan(b,o);
  const c=await check(b);if(!c)return 'no check screen';
  const n=await next(b);if(n!=='ok')return 'next '+n;
  const a1=await answer(b,'turn',o.turn==='b'?'Black':'White');if(a1!=='ok')return 'turn '+a1;
  const a2=await answer(b,'side',o.side==='b'?'Black':'White');if(a2!=='ok')return 'side '+a2;
  const st=await start(b,o.kind||'Play');await b.settle(o.settle==null?900:o.settle);return st;
}
// THE GAME'S OWN SCREEN. best(): the three best moves under the board, the row found by its name (role status, 'Best moves').
const best=(b)=>b.page.evaluate(()=>{const e=[...document.querySelectorAll('[role="status"][aria-label="Best moves"]')].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0;});if(!e)return null;
  const r=e.getBoundingClientRect();const slots=[...e.children].filter(x=>x.tagName==='SPAN').slice(-3).map(x=>{const san=x.querySelector('b');const all=(x.innerText||'').replace(/\s+/g,' ').trim();const s=san?(san.innerText||'').trim():'';
    return {san:s,ev:san?all.slice(s.length).trim():'',text:all,cut:x.scrollWidth>x.clientWidth+1,w:Math.round(x.getBoundingClientRect().width*10)/10};});
  return {y:Math.round(r.top*10)/10,h:Math.round(r.height*10)/10,x:Math.round(r.left*10)/10,right:Math.round(r.right*10)/10,head:(e.innerText||'').split('\n')[0].trim(),sans:slots.map(s=>s.san).filter(Boolean),slots,vis:getComputedStyle(e).visibility,vw:window.innerWidth};});
// which squares of the board on screen carry a piece (an image or the fallback glyph), named by the board's own orientation
const occupied=(b)=>b.page.evaluate(()=>{const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width);const g=els[0];if(!g)return null;
  const kids=[...g.children].slice(0,64);const bl=kids[56]?(kids[56].innerText||''):'';const br=kids[63]?(kids[63].innerText||''):'';const flip=/h/.test(bl)&&!/a/.test(bl)?true:(/a/.test(br)&&!/h/.test(br)?true:false);
  const out=[];kids.forEach((s,i)=>{const dr=Math.floor(i/8),dc=i%8;const r=flip?7-dr:dr,c=flip?7-dc:dc;if(s.querySelector('img'))out.push('abcdefgh'[c]+(8-r));});return {flip,sq:out.sort()};});
// the last moves played (at most THREE - the log keeps three), oldest first, read from the live log of moves every Play
// screen keeps in the DOM (role log, 'Last moves'); each move is the bold part of its entry, the number before it is not read
const played=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[role="log"][aria-label="Last moves"]');if(!e)return null;
  return [...e.querySelectorAll('b')].map(x=>(x.textContent||'').trim()).filter(Boolean);});
const rowBtn=(b,name)=>b.page.evaluate((name)=>{const x=[...document.querySelectorAll('button')].find(e=>(e.getAttribute('aria-label')||'')===name&&e.getBoundingClientRect().height>0&&!e.closest('[role="dialog"]'));if(!x)return null;
  const r=x.getBoundingClientRect();return {dis:!!x.disabled,w:Math.round(r.width),h:Math.round(r.height),words:(x.innerText||'').trim()};},name);
const tapRow=async(b,name,wait)=>{await b.page.evaluate((name)=>{const x=[...document.querySelectorAll('button')].find(e=>(e.getAttribute('aria-label')||'')===name&&e.getBoundingClientRect().height>0&&!e.closest('[role="dialog"]'));if(x)x.click();},name);await b.settle(wait==null?400:wait);};
module.exports={png8,signIn,stub,scan,cameraSide,check,tapSquare,pick,btn,tapBtn,next,answer,answered,start,through,best,occupied,played,rowBtn,tapRow,Q};
