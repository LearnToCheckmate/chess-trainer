'use strict';
// gates/regress/194-drill-jump-to-a-card.js - THE DRILL'S COUNTER JUMPS TO ANY CARD, AND THE BOARD SHOWS THAT CARD. US-R114 / TC-R324..325.
//
// WHY [#553 B1, jobs/the-brilliant-moves-drill-jumps-to-a-number-from-its-counter-2026-11-11]. Kunal, 11 Nov 2026, of "Your brilliant moves,
// 8 of 36": "I thought we were going to provide a way to like jump to a specific number so we don't have to like hit next next next 50
// times". #550 built it (the counter is a button, data-ct drill-counter, opening a 'Go to card' sheet of numbers that call drillGo) and gate
// 72 block L (TC-R178) checks it on 5 cards by the counter's text only. The fresh checker of 15 Nov (checkVerdict_orch1115, verdict GAP) held
// TC-R178 short of the case the job's close condition names - TC-R37's caseADDITION of 30 Sep: 18 cards; choose 18 and the BOARD shows the
// 18th card; tap the counter again, choose 2, the same; Prev from 2 reaches 1; a NEGATIVE CONTROL that no number outside 1..N can be reached;
// every number a 44x44 target. This gate is that case. No chess.jsx change: the checker's probe found the shipped app passes it.
// WHAT IT READS: the bundle under test (CT_APP), both drills (Practice your mistakes, Your brilliant moves) seeded with the SAME 18 distinct
// legal positions (black king e8, a white queen on rank 2 that does not see it, the white king on e1, h1 or a1; the answer is the queen up
// its file), at 375x761 with his insets (kunal761) and 320x568 (se). The BOARD is read as the painted position (every occupied square's piece
// image), and the card each number must show is learned by a REFERENCE WALK first: Next from card 1 to card 18, recording each card's board.
//  TC-R324 DENOMINATOR the drill opened on card 1 of 18, and the reference walk reached 18 of 18 with 18 distinct boards.
//  TC-R324 the counter opens a chooser offering exactly the numbers 1..18, each once, with no field to type into; every number is at least
//          44x44 and wholly on screen.
//  TC-R324 choose 18: the counter reads 18 of 18 and the board is card 18's; tap the counter again and choose 2: 2 of 18 and card 2's board;
//          Prev: 1 of 18 and card 1's board; Next: 2 of 18 and card 2's board.
//  TC-R325 NEGATIVE CONTROL, driven: with the chooser open, type 1, 9, Enter, 0, Enter and Escape, then tap outside it - the drill is still on
//          the card it was on (counter and board unchanged) and the chooser is closed. So no number outside 1..18 (19, 190) is reachable.
//  TC-R324 zero app errors.
const L=require('../lib');
// the 18 positions: three white king squares x the queen's file (not e), the first 18
const KS=[['4K3',''],['7K','h1'],['K7','a1']];const FILES='abcdfgh';
const SEED=[];for(const [krank] of KS)for(const f of FILES){if(SEED.length>=18)break;const fi='abcdefgh'.indexOf(f);
  const r2=(fi>0?String(fi):'')+'Q'+(7-fi>0?String(7-fi):'');SEED.push({fen:'4k3/8/8/8/8/8/'+r2+'/'+krank+' w - - 0 1',uci:f+'2'+f+'7'});}
// a1 king with a queen on a2 blocks nothing; h1 king with h2 queen likewise - every one is legal and the answer's path is empty
const N=SEED.length;
const rows=(label)=>SEED.map((s,i)=>({fen:s.fen,uci:s.uci,label,played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn (card '+(i+1)+')',hint:'look up the file (card '+(i+1)+')'}));
// as gate 72: every seeded mistake card is marked already re-graded, so the Home pass does not thin the deck
{const _lz=L.launch;L.launch=(o)=>{if(o&&o.store&&Array.isArray(o.store.ct_mymistakes))o={...o,store:{...o.store,ct_mymistakes:o.store.ct_mymistakes.map(c=>c&&!c.wc?{...c,wc:{g:'Blunder',drop:25}}:c)}};return _lz(o);};}
const DRILLS=[
 {k:'mistakes',enter:/find the move you missed/,store:{ct_mymistakes:rows('Blunder'),ct_pool:'3'}},
 {k:'brilliant',enter:/can you spot them again\?/,store:{ct_mybrilliancies:rows('Brilliant'),ct_bril_reset_v1:'1',ct_bril_lib:'0',ct_pool:'3'}},
];
const placement=(b)=>b.page.evaluate(()=>{const els=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
  let best=null,bw=0;for(const e of els){const q=e.getBoundingClientRect();if(q.width>bw){bw=q.width;best=e;}}if(!best||best.children.length<64)return null;
  return [...best.children].slice(0,64).map((c,i)=>{const im=c.querySelector('img');return im?(i+':'+String(im.getAttribute('src')||'').slice(-10)):null;}).filter(Boolean).join('|');});
const idx=(b)=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');if(!t)return null;const m=(t.innerText||'').match(/(\d+)\s+of\s+(\d+)/);return m?{i:+m[1],n:+m[2]}:null;});
// the counter, found by its TEXT 'i of N' inside pz-top (the smallest element carrying it), never only by its hook
const counterAt=(b)=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');if(!t)return null;let best=null,ba=1e9;
  for(const e of t.querySelectorAll('*')){const x=(e.innerText||'').trim();if(!/\b\d+ of \d+\b/.test(x))continue;const r=e.getBoundingClientRect();const a=r.width*r.height;if(r.width>1&&a<ba){ba=a;best={x:r.left+r.width/2,y:r.top+r.height/2};}}return best;});
const chooser=(b)=>b.page.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>1&&r.height>1&&getComputedStyle(e).visibility!=='hidden';};
  const tb=document.querySelector('[data-ct="tabbar"]');const tq=tb&&tb.getBoundingClientRect();
  // the numbers: visible buttons whose whole text is a number, on a fixed layer over the drill
  const nums=[...document.querySelectorAll('button')].filter(vis).filter(e=>/^\d+$/.test((e.innerText||'').trim())).map(e=>{const r=e.getBoundingClientRect();
    const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {n:+(e.innerText||'').trim(),w:+r.width.toFixed(1),h:+r.height.toFixed(1),x:r.left+r.width/2,y:r.top+r.height/2,
      on:r.left>=-0.5&&r.right<=innerWidth+0.5&&r.top>=-0.5&&r.bottom<=innerHeight+0.5,hit:!!h&&(h===e||e.contains(h))};});
  const layer=[...document.querySelectorAll('div')].find(d=>getComputedStyle(d).position==='fixed'&&vis(d)&&[...d.querySelectorAll('button')].some(x=>/^\d+$/.test((x.innerText||'').trim())));
  const typeable=layer?[...layer.querySelectorAll('input,textarea,select,[contenteditable="true"]')].filter(vis).length:null;
  return {open:!!layer,nums,typeable};});
const tapNum=async(b,n)=>{const c=await chooser(b);const x=c.nums.find(z=>z.n===n);if(!x)return false;await b.page.mouse.click(x.x,x.y);await b.settle(900);return true;};
const openChooser=async(b)=>{const c=await counterAt(b);if(!c)return false;await b.page.mouse.click(c.x,c.y);await b.settle(600);return true;};
const next=async(b)=>{try{await b.page.locator('[data-ct="drill-next"]').click({timeout:4000});}catch(e){return false;}await b.settle(900);return true;};
const prev=async(b)=>{try{await b.page.locator('[data-ct="drill-prev"]').click({timeout:4000});}catch(e){return false;}await b.settle(900);return true;};
L.run(async()=>{
  for(const D of DRILLS)for(const [gn,geo] of [['375x761','kunal761'],['320x568','se']]){const tag=gn+' '+D.k;
    const b=await L.launch({geo,name:'g194-'+D.k+'-'+geo,store:D.store});await b.open();await b.tile('Review');await b.settle(700);
    let ok=true;try{await b.tapText(D.enter,{wait:1800});}catch(e){ok=false;}await b.settle(900);
    const p0=ok?await idx(b):null;
    // the reference walk: card k's board, for k = 1..N
    const ref=[null];if(ok&&p0&&p0.i===1){ref.push(await placement(b));for(let k=2;k<=N;k++){await next(b);const p=await idx(b);if(!p||p.i!==k)break;ref.push(await placement(b));}}
    const distinct=new Set(ref.slice(1).filter(Boolean)).size;
    L.say(ok&&!!p0&&p0.i===1&&p0.n===N&&ref.length===N+1&&distinct===N,tag+': TC-R324 DENOMINATOR the drill opened on card 1 of '+N+' and the reference walk reached '+(ref.length-1)+' of '+N+' with '+distinct+' distinct boards',{p0,walked:ref.length-1,distinct});
    if(ref.length===N+1){
      // back to card 1 by the chooser is under test, so go back by Prev (the walk's inverse)
      for(let k=N;k>1;k--)await prev(b);const back=await idx(b);
      let opened=await openChooser(b);const c=opened?await chooser(b):{open:false,nums:[],typeable:null};
      const ns=c.nums.map(z=>z.n).sort((a,z)=>a-z);const exact=ns.length===N&&ns.every((v,i)=>v===i+1);
      const small=c.nums.filter(z=>z.w<44-0.5||z.h<44-0.5||!z.on||!z.hit);
      L.say(!!back&&back.i===1&&c.open&&exact&&c.typeable===0,tag+': TC-R324 the counter opens a chooser offering exactly 1..'+N+' ('+ns.length+' numbers, '+(exact?'each once':'NOT 1..N: '+ns.join(','))+') with no field to type into ('+c.typeable+')',{back,ns,typeable:c.typeable});
      L.say(c.nums.length===N&&small.length===0,tag+': TC-R324 every number is at least 44x44, wholly on screen and takes a tap ('+(c.nums.length?Math.min(...c.nums.map(z=>z.w))+'x'+Math.min(...c.nums.map(z=>z.h)):'none')+' the smallest; '+small.length+' short)',{small:small.slice(0,4)});
      // choose N
      const t18=await tapNum(b,N);const a18=await idx(b),b18=await placement(b);
      // choose 2
      const o2=await openChooser(b);const t2=o2&&await tapNum(b,2);const a2=await idx(b),b2=await placement(b);
      // Prev, then Next
      await prev(b);const a1=await idx(b),b1=await placement(b);await next(b);const a2n=await idx(b),b2n=await placement(b);
      const good=t18&&!!a18&&a18.i===N&&a18.n===N&&b18===ref[N]&&t2&&!!a2&&a2.i===2&&b2===ref[2]&&!!a1&&a1.i===1&&b1===ref[1]&&!!a2n&&a2n.i===2&&b2n===ref[2];
      L.say(good,tag+': TC-R324 choose '+N+' reads '+(a18&&a18.i)+' of '+(a18&&a18.n)+' with card '+N+'\'s board ('+(b18===ref[N])+'); the counter again, choose 2: '+(a2&&a2.i)+' ('+(b2===ref[2])+'); Prev: '+(a1&&a1.i)+' ('+(b1===ref[1])+'); Next: '+(a2n&&a2n.i)+' ('+(b2n===ref[2])+')',{a18,a2,a1,a2n});
      // NEGATIVE CONTROL: type an out-of-range number into the open chooser, then tap outside it
      const before=await idx(b),bb=await placement(b);const o3=await openChooser(b);
      for(const k of ['1','9','Enter','0','Enter','Escape'])await b.page.keyboard.press(k);await b.settle(400);
      const still=await chooser(b);if(still.open){await b.page.mouse.click(8,8);await b.settle(600);}
      const after=await idx(b),ba=await placement(b),closed=!(await chooser(b)).open;
      L.say(o3&&!!before&&!!after&&after.i===before.i&&after.n===N&&ba===bb&&closed,tag+': TC-R325 NEGATIVE CONTROL typing 1, 9, Enter, 0, Enter, Escape into the open chooser and tapping outside it leaves the drill on card '+(before&&before.i)+' (reads '+(after&&after.i)+' of '+(after&&after.n)+', board unchanged '+(ba===bb)+') and the chooser closed ('+closed+')',{before,after,closed});
    }
    L.say(b.errs.length===0,tag+': TC-R324 zero app errors',b.errs.slice(0,3));
    await b.close();}
},'194-drill-jump-to-a-card');
