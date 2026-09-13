// gates/drive/puzzles.js - drives the Puzzles screen (roadmap, training, free play: solve, fail, hint, show,
// reset, next/previous, back, the Daily 3 card) on the bundle under test. Every state function takes a
// launched+opened `b` from gates/lib.js and puts the app into that state from wherever it is. Each state starts
// from a FRESH puzzle store (the app persists progress in localStorage 'chesstrainer.progress.v1' the moment a
// puzzle is solved, and 'Start training' then lands on the next unsolved puzzle), so the states are deterministic
// and the regression suite can call any one of them on its own.
//
//   const Z=require('./drive/puzzles');  await Z.states['train-solved'](b);  const m=await b.metrics();
//
// THE PUZZLES: PZ is sorted by rating; the Novice tier is PZ[0..110]. Fresh store -> ▶ Start training opens
// PZ[0] = g0 (White, mate in 2: Re8+ Rf8 Rxf8#, hint 51 chars). The longest hint in the tier is c0 = PZ[95]
// (113 chars, Qd8#, verdict 150 chars): the 'long-*' states seed PZ[0..94] as solved and open the Novice node on
// the roadmap (rank 1 by then, so 'Start training' would open Apprentice; the node opens the tier's first
// unsolved). 'rankup' seeds PZ[0..8] and solves PZ[9] (g9: Qxd8+ Bxd8 Rxd8#), the 10th Novice solve = RANK UP.
//
// STATES:
//   roadmap            Puzzles tile, fresh store: the Novice card, ▶ Start training, the road (scrolled to top)
//   roadmap-bottom     the roadmap scrolled to its end: 🧩 Free play, 🌐 Online puzzles, the Unlock code row
//   roadmap-rank1      seeded: Novice done (95 solved), Apprentice the active tier
//   daily3             Home 'Daily 3' card with today's lesson already done (ct_daily3) - it opens the puzzle roadmap
//   daily3-solved      … then ▶ Start training and a solve (ct_daily3.puz should read 1)
//   train              ▶ Start training: PZ[0], nothing played
//   train-show         👁 Show (the solution squares highlighted, the 👁 message in the verdict box)
//   train-step1        Re8+ played: '✓ Re8+ — good! Now finish it.' and Black's reply Rf8 auto-played
//   train-solved       Rxf8# played: '🎉 Solved! …', the row is ‹ | Next ›
//   train-solved-next  Next › from the solved puzzle
//   train-fail         a wrong legal move (Re7): the ✗ message
//   train-fail-reset   ↺ Reset after the wrong move
//   train-hint         💡 Hint: the hint takes over the header row (pz-hint-head)
//   train-hint-show    … then 👁 Show (the header goes back to ‹ Roadmap, the 👁 line in the verdict box)
//   train-next-before  the Next chevron BEFORE solving (A-10)
//   train-prev         the Previous chevron from the tier's first puzzle
//   train-back         ‹ Roadmap from the training puzzle
//   free-play          🧩 Free play — browse any puzzle (from the roadmap; header 'Free play · ✓ 0')
//   free-play-next     … then the Next chevron (PZ[1], Black to move: the board flips)
//   long-hint          PZ[95] (c0) with 💡 Hint: the 113-char curated hint in the header
//   long-solved        PZ[95] solved with Qd8#: the 150-char verdict in the one-line box
//   long-fail          PZ[95] with a wrong move (Qd7)
//   rankup             the 10th Novice solve: the RANK UP overlay
//   rankup-continue    … Continue ▶ pressed (the solved puzzle under it)
//   a06                the gallery card A-06 (puzzle with a hint showing) - the reference numbers
'use strict';
const PZKEY='chesstrainer.progress.v1',PZUKEY='chesstrainer.unlock.v1';
// PZ[0..94] on the live bundle (PZGEN_RAW sorted by rating; the first 95 are g0..g94 in order)
const FIRST95=Array.from({length:95},(_,i)=>'g'+i);
const FIRST9=Array.from({length:9},(_,i)=>'g'+i);
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

// the puzzle store: seed / clear and reload so the app reads it on mount. Every state calls fresh() first.
async function setStore(b,obj){await b.page.evaluate((o)=>{for(const k in o){if(o[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,typeof o[k]==='string'?o[k]:JSON.stringify(o[k]));}},obj);await b.open();}
async function fresh(b){const dirty=await b.page.evaluate((ks)=>ks.some(k=>localStorage.getItem(k)!=null),[PZKEY,PZUKEY,'ct_daily3','ct_daily']);if(dirty)await setStore(b,{[PZKEY]:null,[PZUKEY]:null,ct_daily3:null,ct_daily:null});await b.home();}
async function seedSolved(b,ids){await setStore(b,{[PZKEY]:{solved:Object.fromEntries(ids.map(id=>[id,1])),streak:0,best:0,xp:0,online:0,onlineIds:{}},[PZUKEY]:null,ct_daily3:null,ct_daily:null});await b.home();}

// the smallest visible BUTTON whose text matches (lib's tapText matches any element; the roadmap is long, so scroll it into view)
async function tapBtn(b,re,wait){
  const h=await b.page.evaluateHandle((src)=>{const re=new RegExp(src[0],src[1]);let best=null,ba=1e12;for(const el of document.querySelectorAll('button')){const t=(el.innerText||'').trim();if(!re.test(t))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;const a=r.width*r.height;if(a<ba){ba=a;best=el;}}if(best)best.scrollIntoView({block:'center',inline:'center'});return best;},[re.source,re.flags]);
  const el=h.asElement();if(!el)throw new Error('tapBtn: no button matches '+re);
  await b.page.waitForTimeout(150);const box=await el.boundingBox();
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(wait==null?500:wait);return box;
}
async function tapAria(b,label,wait){const el=b.page.locator('[aria-label="'+label+'"]').first();await el.waitFor({state:'visible',timeout:8000});const box=await el.boundingBox();await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(wait==null?500:wait);return box;}
// the puzzle text: the verdict/message line (✓ ✗ 👁 🎉 💡) wherever it is, the hint header, the goal, the header counters
async function msg(b){return b.page.evaluate(()=>{const top=document.querySelector('[data-ct="pz-top"]');if(!top)return null;const leaf=[...top.querySelectorAll('div,span')].filter(d=>d.children.length===0&&/^(✗|✓|👁|💡|🎉)/.test((d.innerText||'').trim()));const e=leaf[leaf.length-1];if(!e)return null;const r=e.getBoundingClientRect();const st=getComputedStyle(e);return {text:(e.innerText||'').trim(),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,top:Math.round(r.top*10)/10,cw:e.clientWidth,sw:e.scrollWidth,ch:e.clientHeight,sh:e.scrollHeight,fs:st.fontSize,lh:st.lineHeight,ws:st.whiteSpace,ct:e.getAttribute('data-ct')||''};});}
// the board's piece signature (img srcs per cell) - a changed signature means a different position on screen
async function sig(b){return b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return '';return [...g.children].slice(0,64).map(c=>{const im=c.querySelector('img');return im?(im.getAttribute('src')||'').slice(-10):'';}).join('|');});}
// the roadmap scroll box (the app scrolls the document or a container): {sh,ch,top}
async function scrollBox(b){return b.page.evaluate(()=>{const de=document.scrollingElement||document.documentElement;const boxes=[...document.querySelectorAll('div')].filter(el=>{const st=getComputedStyle(el);return (st.overflowY==='auto'||st.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+1;}).map(el=>{const r=el.getBoundingClientRect();return {sh:el.scrollHeight,ch:el.clientHeight,top:Math.round(r.top),h:Math.round(r.height),st:el.scrollTop,pos:getComputedStyle(el).position};});return {doc:{sh:de.scrollHeight,ch:de.clientHeight,st:de.scrollTop},boxes};});}
async function scrollTo(b,where){await b.page.evaluate((w)=>{const de=document.scrollingElement||document.documentElement;const boxes=[...document.querySelectorAll('div')].filter(el=>{const st=getComputedStyle(el);return (st.overflowY==='auto'||st.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+1;});for(const el of boxes)el.scrollTop=w==='end'?el.scrollHeight:0;de.scrollTop=w==='end'?de.scrollHeight:0;window.scrollTo(0,w==='end'?1e6:0);},where);await b.page.waitForTimeout(300);}
async function btnRects(b){return b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight;}).map(x=>{const r=x.getBoundingClientRect();return {t:(x.innerText||x.getAttribute('aria-label')||x.title||'').replace(/\s+/g,' ').trim().slice(0,40),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),dis:x.disabled};}));}
async function waitMsg(b,re,ms){const t0=Date.now();while(Date.now()-t0<(ms||4000)){const m=await msg(b);if(m&&re.test(m.text))return m;await b.page.waitForTimeout(60);}return msg(b);}

async function startTraining(b){await b.home();await b.tile('Puzzles');await b.settle(400);await tapBtn(b,/^▶ (Start training|Train next puzzle)$/,900);}

const S={};
S['roadmap']=async(b)=>{await fresh(b);await b.tile('Puzzles');await b.settle(500);await scrollTo(b,'top');};
S['roadmap-bottom']=async(b)=>{await S['roadmap'](b);await scrollTo(b,'end');};
S['roadmap-rank1']=async(b)=>{await seedSolved(b,FIRST95);await b.tile('Puzzles');await b.settle(500);await scrollTo(b,'top');};
S['daily3']=async(b)=>{await setStore(b,{[PZKEY]:null,[PZUKEY]:null,ct_daily:null,ct_daily3:{date:today(),lesson:1,puz:0}});await b.home();await b.tapText(/^Daily 3\n/,{wait:800});};
// the Daily 3 card lands on the roadmap (setMode('puzzle')); Start training + a solve should bump ct_daily3.puz to 1
S['daily3-solved']=async(b)=>{await S['daily3'](b);await tapBtn(b,/^▶ (Start training|Train next puzzle)$/,900);await b.move('e1','e8',0);await waitMsg(b,/^✓/,3000);await b.settle(900);await b.move('e8','f8',0);await waitMsg(b,/^🎉/,3000);await b.settle(1400);};
S['train']=async(b)=>{await fresh(b);await startTraining(b);};
S['train-show']=async(b)=>{await S['train'](b);await tapBtn(b,/^👁 Show$/,600);};
S['train-step1']=async(b)=>{await S['train'](b);await b.move('e1','e8',0);await waitMsg(b,/^✓/,3000);await b.settle(900);};   // the reply Rf8 comes 450 ms later
S['train-solved']=async(b)=>{await S['train-step1'](b);await b.move('e8','f8',0);await waitMsg(b,/^🎉/,3000);await b.settle(1400);};  // pzBurst confetti 1.2 s
S['train-solved-next']=async(b)=>{await S['train-solved'](b);await tapBtn(b,/^Next ›$/,700);};
S['train-fail']=async(b)=>{await S['train'](b);await b.move('e1','e7',0);await waitMsg(b,/^✗/,3000);await b.settle(400);};
S['train-fail-reset']=async(b)=>{await S['train-fail'](b);await tapBtn(b,/^↺ Reset$/,600);};
S['train-hint']=async(b)=>{await S['train'](b);await tapBtn(b,/^💡 Hint$/,600);};
S['train-hint-show']=async(b)=>{await S['train-hint'](b);await tapBtn(b,/^👁 Show$/,600);};
S['train-next-before']=async(b)=>{await S['train'](b);await tapAria(b,'Next puzzle',600);};
S['train-prev']=async(b)=>{await S['train'](b);await tapAria(b,'Previous puzzle',600);};
S['train-back']=async(b)=>{await S['train'](b);await tapBtn(b,/^‹ Roadmap$/,600);await scrollTo(b,'top');};
S['free-play']=async(b)=>{await S['roadmap'](b);await tapBtn(b,/^🧩 Free play/,800);};
S['free-play-next']=async(b)=>{await S['free-play'](b);await tapAria(b,'Next puzzle',600);};
// PZ[95] = c0 through the Novice node with 95 solved
// the Novice node reads '✓ Novice' once the tier's 10 are solved (rank 1), '🌱 Novice n/10' before that
async function openC0(b){await seedSolved(b,FIRST95);await b.tile('Puzzles');await b.settle(500);await tapBtn(b,/^(✓|🌱)\s*Novice/,900);
  const goal=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');return t?(t.innerText||''):'';});
  if(!/mate in 1/.test(goal))throw new Error('openC0: expected PZ[95] (White to play — mate in 1), got: '+goal.replace(/\s+/g,' ').slice(0,120));}
S['long-hint']=async(b)=>{await openC0(b);await tapBtn(b,/^💡 Hint$/,600);};
S['long-solved']=async(b)=>{await openC0(b);await b.move('d1','d8',0);await waitMsg(b,/^🎉/,3000);await b.settle(1400);};
S['long-fail']=async(b)=>{await openC0(b);await b.move('d1','d7',0);await waitMsg(b,/^✗/,3000);await b.settle(400);};
// the 10th Novice solve: PZ[9] = g9 (Qd5xd8+, Bf6xd8, Rd1xd8#)
S['rankup']=async(b)=>{await seedSolved(b,FIRST9);await startTraining(b);
  const goal=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="pz-top"]');return t?(t.innerText||''):'';});
  if(!/mate in 2/.test(goal))throw new Error('rankup: expected PZ[9] (White to move — mate in 2), got: '+goal.replace(/\s+/g,' ').slice(0,120));
  await b.move('d5','d8',0);await waitMsg(b,/^✓/,3000);await b.settle(900);await b.move('d1','d8',0);await b.settle(1600);};
S['rankup-continue']=async(b)=>{await S['rankup'](b);await tapBtn(b,/^Continue ▶$/,700);};
S['a06']=async(b)=>{await fresh(b);await b.card('A-06',7000);};

module.exports={states:S,fresh,seedSolved,setStore,tapBtn,tapAria,msg,waitMsg,sig,scrollBox,scrollTo,btnRects,startTraining,FIRST95,FIRST9,PZKEY,PZUKEY,
  notes:'Home -> Puzzles tile opens the roadmap (pzView roadmap): the Novice card with ▶ Start training, the road with one 96px node per tier (only unlocked nodes are enabled), then 🧩 Free play, 🌐 Online puzzles and the Unlock code row below the fold. Start training / a node / Free play open the browse view (data-ct pz-top: the header row "‹ Roadmap | n / 890 · rating | tier · ✓ solved", the goal card, a one-line verdict box on phones; the board; pz-bottom: ‹ | 💡 Hint | 👁 Show | ↺ Reset | › on one row, ‹ | Next › once solved). A hint replaces the header row (pz-hint-head, 3-line clamp) instead of the verdict box. Moves are piece-tap then target-tap. Progress persists in localStorage chesstrainer.progress.v1 ({solved:{id:1},streak,best,xp,...}) - every state clears or seeds it and reloads first.'};
