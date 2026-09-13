// audit/wrongmove-probe.js  X-07: play a legal but WRONG move on the first training puzzle and measure the
// verdict box: text, clientWidth vs scrollWidth (clipped?), and that the box stays one line. Finds a legal move
// generically: tap squares until the legal-target dots appear (round elements inside the grid, diffed before and
// after the tap - HANDOFF trap: never count round elements without a diff), then tap a dot that is NOT a solution
// square (the solution squares come from 👁 Show first).
'use strict';
process.env.CT_SHOTS=require('path').join(__dirname,'..','shots','audit','wrongmove');
const L=require('../lib');
const tag=process.argv[2]||'x';
const dots=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return [];const R=g.getBoundingClientRect(),sq=R.width/8;const out=[];for(const e of g.querySelectorAll('div,span')){const st=getComputedStyle(e);if(!/50%/.test(st.borderRadius))continue;const r=e.getBoundingClientRect();if(r.width<6||r.width>sq)continue;if((e.innerText||'').trim())continue;const c=Math.floor((r.left+r.width/2-R.left)/sq),row=Math.floor((r.top+r.height/2-R.top)/sq);out.push(c+','+row);}return [...new Set(out)];});
const sqName=(c,row,flip)=>{const f=flip?7-c:c,r=flip?row:7-row;return String.fromCharCode(97+f)+(r+1);};
L.run(async()=>{
  const b=await L.launch({geo:'kunal',name:'wrong-'+tag});await b.open();await b.tile('Puzzles');await b.tapText(/^▶ (Start training|Train next puzzle)/,{wait:900});
  const bd=await b.board();L.note('board '+JSON.stringify(bd&&{w:bd.w,top:bd.y,flip:bd.flip}));
  // learn the solution squares from Show, then reset
  await b.tapText(/^👁 Show$/,{wait:700});const hl=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const R=g.getBoundingClientRect(),sq=R.width/8;const out=[];[...g.children].slice(0,64).forEach((c,i)=>{const st=getComputedStyle(c);const bs=st.boxShadow+'|'+st.outline+'|'+st.backgroundColor;const r=c.getBoundingClientRect();if(/inset|rgb\(2[0-9][0-9]|yellow|gold/i.test(bs)&&/inset/.test(st.boxShadow))out.push(i%8+','+Math.floor(i/8));});return out;});
  L.note('highlighted after Show: '+JSON.stringify(hl));const msgShow=await b.text('[data-ct="pz-bottom"]');L.note('bottom after Show: '+(msgShow||'').slice(0,120));
  await b.tapText(/^↺ Reset$/,{wait:600});
  // find a piece with legal moves whose targets include a square not in the Show highlight
  let played=null;const base=await dots(b);
  outer: for(let row=0;row<8;row++)for(let c=0;c<8;c++){const from=sqName(c,row,bd.flip);await b.tapSq(from);const d=await dots(b);const fresh=d.filter(x=>!base.includes(x));if(fresh.length){const cand=fresh.find(x=>!hl.includes(x))||fresh[0];const [tc,tr]=cand.split(',').map(Number);const to=sqName(tc,tr,bd.flip);await b.tapSq(to);await b.settle(900);played={from,to};break outer;}await b.tapSq(from);await b.page.waitForTimeout(80);}
  L.note('played '+JSON.stringify(played));
  const box=await b.page.evaluate(()=>{const cands=[...document.querySelectorAll('div')].filter(e=>e.children.length===0&&/isn.t it/.test(e.innerText||''));const e=cands[cands.length-1];if(!e){const pt=document.querySelector('[data-ct="pz-top"]');return {text:'NO MESSAGE; pz-top: '+((pt&&pt.innerText)||'').replace(/\s+/g,' ').slice(0,160)};}const r=e.getBoundingClientRect();return {text:(e.innerText||'').trim(),w:Math.round(r.width),h:Math.round(r.height),cw:e.clientWidth,sw:e.scrollWidth,clipped:e.scrollWidth>e.clientWidth+1};});
  L.note('verdict box: '+JSON.stringify(box));await b.shot(tag+'-wrongmove');
  L.say(!!box&&/isn.t it/.test(box.text||''),tag+': a wrong-move message appeared',box&&box.text);
  L.say(!!box&&box.clipped===false,tag+': the message is not clipped (scrollWidth '+(box&&box.sw)+' vs clientWidth '+(box&&box.cw)+')');
  L.say(b.errs.length===0,tag+': zero app errors',b.errs.slice(0,3));
  await b.close();
},'WRONGMOVE');
