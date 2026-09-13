// gates/drive/play.js - drives the Play screen (setup sheet, vs Computer, Pass & Play, game over by resign and
// by checkmate) on the bundle under test. Every state function takes a launched+opened `b` from gates/lib.js and
// puts the app into that state from wherever it is (each one starts at Home and composes the previous states),
// so the regression suite can call any state on its own and get the same screen every time.
//
//   const P=require('./drive/play');  await P.states['cpu-4ply'](b);  const m=await b.metrics();
//
// THREE THINGS THE APP REMEMBERS INSIDE A SESSION (so the states normalise them): the opponent tile, the colour
// chip and the time control on the setup sheet, and whether the move list under the control row is shown (the
// 'Moves' button; shown on a fresh load, and a hidden list survives Rematch, Home and a new game). A bot once
// picked stays picked (there is no 'no bot' tile), so 'setup' shows whichever bot the session last chose.
//
// STATES:
//   setup                 the New Game sheet, Computer + White + No clock, sheet scrolled to its top
//   setup-bot-pip|rosa|milo|astrid|viktor   a bot tile tapped (the row scrolls sideways; sheet scrolled back to top)
//   setup-black           Computer + Black chip
//   setup-clock           Computer + '1 min' time control
//   setup-passplay        Pass & Play + No clock
//   setup-online          Online selected (no network here)
//   online-continue       Online -> 'Continue' (the sign-in screen; there is no way back but a reload)
//   cpu-m0                vs Pip as White, move 0, move list shown
//   cpu-1e4               ... 1.e4 played (measured before the reply is waited for)
//   cpu-reply             ... the engine has answered (2 plies)
//   cpu-4ply              ... 2.Nf3 and the reply (4 plies)
//   cpu-moves-hidden      ... 'Moves' tapped once: the move list is hidden (the app's movesOpen=false)
//   cpu-moves-shown       ... 'Moves' tapped again: the list is back
//   cpu-back / cpu-forward   Back one ply / Forward again (4 plies on the board)
//   cpu-hint              Hint tapped at 4 plies
//   cpu-flip              Flip tapped at 4 plies (board flipped)
//   cpu-more              the More sheet open at 4 plies
//   cpu-resigned          More -> Resign: game over by resignation
//   cpu-resigned-more     the More sheet open after the resignation
//   cpu-rematch           Rematch from the resigned game (a fresh game, move 0)
//   cpu-black             vs Pip as Black: the engine has moved first, board flipped
//   cpu-clock-m0          vs Pip, 1 min clock, move 0 (the clock pills are in the bars)
//   cpu-viktor-1e4        vs Viktor (2350), 1.e4 just played - the state to sample the 'thinking' status line
//   pp-m0                 Pass & Play, move 0
//   pp-1                  ... 1.f3 (the board turns to Black)
//   pp-mate               ... fool's mate 1.f3 e5 2.g4 Qh4#: game over by checkmate
//   pp-mate-more          the More sheet open on the mated game
//   pp-mate-back          Back one ply from the mate
//   pp-rematch            Rematch from the mated game
//   pp-captures           Pass & Play, 18 plies with nine captures (the taken-pieces rows are full)
//   k10                   the gallery card k10 (Scholar's mate game over) - the reference numbers
'use strict';

// tap the smallest BUTTON whose text matches, scrolled into view on both axes first (the bot row scrolls
// sideways; the Computer sheet scrolls down). lib's tapText matches any element and can pick the player bar
// that sits BEHIND the setup sheet, so the sheet is driven through buttons only.
async function tapBtn(b,re,wait){
  const h=await b.page.evaluateHandle((src)=>{const re=new RegExp(src[0],src[1]);let best=null,ba=1e12;for(const el of document.querySelectorAll('button')){const t=(el.innerText||'').trim();if(!re.test(t))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;const a=r.width*r.height;if(a<ba){ba=a;best=el;}}if(best)best.scrollIntoView({block:'center',inline:'center'});return best;},[re.source,re.flags]);
  const el=h.asElement();if(!el)throw new Error('tapBtn: no button matches '+re);
  await b.page.waitForTimeout(150);const box=await el.boundingBox();
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(wait==null?500:wait);return box;
}
// plies on the board, read from the live move row ("1. e4 1… e5 2. Nf3" -> 3)
async function plies(b){return b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-moverow"]');if(!e)return -1;const t=(e.innerText||'').trim();const m=[...t.matchAll(/(\d+)(\.|…)\s*(\S+)/g)];if(!m.length)return 0;const last=m[m.length-1];return last[2]==='.'?2*(+last[1])-1:2*(+last[1]);});}
async function waitPlies(b,n,ms){const t0=Date.now();while(Date.now()-t0<(ms||20000)){if((await plies(b))>=n)return Date.now()-t0;await b.page.waitForTimeout(50);}throw new Error('waitPlies('+n+') timed out, have '+(await plies(b)));}
// the status line above the board (data-ct play-context / play-opening)
async function status(b){return b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-opening"]');const c=document.querySelector('[data-ct="play-context"]');return {txt:e?(e.innerText||'').trim():null,h:c?Math.round(c.getBoundingClientRect().height*10)/10:null};});}
// the move list under the control row is shown when its MOVES head is in the DOM
async function movesShown(b){return b.page.evaluate(()=>!!document.querySelector('[data-ct="moves-head"]'));}
async function ensureMovesShown(b){if(!(await movesShown(b))){await tapBtn(b,/^Moves$/,400);return true;}return false;}
// every scrolling box on screen (the setup sheet is one): scrollHeight vs clientHeight
async function scrollers(b){return b.page.evaluate(()=>{const r=[];for(const el of document.querySelectorAll('div')){const st=getComputedStyle(el);if((st.overflowY==='auto'||st.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+1){const rc=el.getBoundingClientRect();r.push({top:Math.round(rc.top),h:Math.round(rc.height),sh:el.scrollHeight,ch:el.clientHeight,pos:st.position,scrollTop:Math.round(el.scrollTop)});}}return r;});}
async function scrollSheetTop(b){await b.page.evaluate(()=>{for(const el of document.querySelectorAll('div')){const st=getComputedStyle(el);if((st.overflowY==='auto'||st.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+1){el.scrollTop=0;if(el.scrollLeft)el.scrollLeft=0;}}window.scrollTo(0,0);});await b.page.waitForTimeout(150);}
// rect of the smallest element whose text matches (any element)
async function textRect(b,re){return b.page.evaluate((src)=>{const re=new RegExp(src[0],src[1]);let best=null,ba=1e12;for(const el of document.querySelectorAll('button,[role=button],a,div,span,label')){const t=(el.innerText||'').trim();if(!re.test(t))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;const a=r.width*r.height;if(a<ba){ba=a;best={x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10,text:t.slice(0,60),tag:el.tagName,sw:el.scrollWidth,cw:el.clientWidth};}}return best;},[re.source,re.flags]);}
async function btnRects(b){return b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight;}).map(x=>{const r=x.getBoundingClientRect();return {t:(x.innerText||x.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,30),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};}));}
async function closeSheet(b){await b.page.mouse.click(8,8);await b.page.waitForTimeout(300);}
async function noClock(b){try{await b.tapText(/^No clock$/,{wait:200});}catch(e){}}

const S={};
S['setup']=async(b)=>{await b.home();await b.tile('Play');await b.settle(500);await tapBtn(b,/^Computer$/,300);await tapBtn(b,/^White$/,200);await noClock(b);await scrollSheetTop(b);};
for(const bot of ['Pip','Rosa','Milo','Astrid','Viktor'])S['setup-bot-'+bot.toLowerCase()]=async(b)=>{await S['setup'](b);await tapBtn(b,new RegExp('^'+bot+'\\n'),300);await scrollSheetTop(b);};
S['setup-black']=async(b)=>{await S['setup'](b);await tapBtn(b,/^Black$/,300);await scrollSheetTop(b);};
S['setup-clock']=async(b)=>{await S['setup'](b);await b.tapText(/^1 min$/,{wait:300});await scrollSheetTop(b);}; // the time chips are spans, not buttons
S['setup-passplay']=async(b)=>{await b.home();await b.tile('Play');await b.settle(500);await tapBtn(b,/^Pass & Play$/,400);await noClock(b);await scrollSheetTop(b);};
S['setup-online']=async(b)=>{await b.home();await b.tile('Play');await b.settle(500);await tapBtn(b,/^Online$/,500);await scrollSheetTop(b);};
S['online-continue']=async(b)=>{await S['setup-online'](b);await tapBtn(b,/^Continue/,1200);};
// vs Computer (Pip, White)
S['cpu-m0']=async(b)=>{await S['setup'](b);await tapBtn(b,/^Pip\n/,200);await tapBtn(b,/^▶ Start game$/,900);await ensureMovesShown(b);};
S['cpu-1e4']=async(b)=>{await S['cpu-m0'](b);await b.move('e2','e4',0);await b.settle(120);};
S['cpu-reply']=async(b)=>{await S['cpu-1e4'](b);await waitPlies(b,2);await b.settle(500);};
S['cpu-4ply']=async(b)=>{await S['cpu-reply'](b);await b.move('g1','f3',0);await waitPlies(b,4);await b.settle(500);};
S['cpu-moves-hidden']=async(b)=>{await S['cpu-4ply'](b);await tapBtn(b,/^Moves$/,500);};
S['cpu-moves-shown']=async(b)=>{await S['cpu-moves-hidden'](b);await tapBtn(b,/^Moves$/,500);};
S['cpu-back']=async(b)=>{await S['cpu-4ply'](b);await tapBtn(b,/^Back$/,400);};
S['cpu-forward']=async(b)=>{await S['cpu-back'](b);await tapBtn(b,/^Forward$/,400);};
S['cpu-hint']=async(b)=>{await S['cpu-4ply'](b);await tapBtn(b,/^Hint$/,700);};
S['cpu-flip']=async(b)=>{await S['cpu-4ply'](b);await tapBtn(b,/^Flip$/,500);};
S['cpu-more']=async(b)=>{await S['cpu-4ply'](b);await tapBtn(b,/^More$/,500);};
S['cpu-resigned']=async(b)=>{await S['cpu-more'](b);await tapBtn(b,/^Resign$/,900);};
S['cpu-resigned-more']=async(b)=>{await S['cpu-resigned'](b);await tapBtn(b,/^More$/,500);};
S['cpu-rematch']=async(b)=>{await S['cpu-resigned'](b);await tapBtn(b,/^Rematch$/,900);};
S['cpu-black']=async(b)=>{await S['setup'](b);await tapBtn(b,/^Pip\n/,200);await tapBtn(b,/^Black$/,200);await tapBtn(b,/^▶ Start game$/,600);await ensureMovesShown(b);await waitPlies(b,1);await b.settle(500);};
S['cpu-clock-m0']=async(b)=>{await S['setup-clock'](b);await tapBtn(b,/^Pip\n/,200);await tapBtn(b,/^▶ Start game$/,900);await ensureMovesShown(b);};
S['cpu-viktor-1e4']=async(b)=>{await S['setup'](b);await tapBtn(b,/^Viktor\n/,200);await tapBtn(b,/^▶ Start game$/,900);await ensureMovesShown(b);await b.move('e2','e4',0);};
// Pass & Play
S['pp-m0']=async(b)=>{await S['setup-passplay'](b);await tapBtn(b,/^▶ Start game$/,900);await ensureMovesShown(b);};
S['pp-1']=async(b)=>{await S['pp-m0'](b);await b.move('f2','f3');await b.settle(300);};
S['pp-mate']=async(b)=>{await S['pp-1'](b);await b.move('e7','e5');await b.move('g2','g4');await b.move('d8','h4');await b.settle(1000);};
S['pp-mate-more']=async(b)=>{await S['pp-mate'](b);await tapBtn(b,/^More$/,500);};
S['pp-mate-back']=async(b)=>{await S['pp-mate'](b);await tapBtn(b,/^Back$/,400);};
S['pp-rematch']=async(b)=>{await S['pp-mate'](b);await tapBtn(b,/^Rematch$/,900);};
// 1.e4 d5 2.exd5 Qxd5 3.Nc3 Qd8 4.d4 e5 5.dxe5 Bc5 6.Qxd8+ Kxd8 7.Bg5+ f6 8.exf6 gxf6 9.Bxf6+ Nxf6  (nine captures)
const CAPTURES=[['e2','e4'],['d7','d5'],['e4','d5'],['d8','d5'],['b1','c3'],['d5','d8'],['d2','d4'],['e7','e5'],['d4','e5'],['f8','c5'],['d1','d8'],['e8','d8'],['c1','g5'],['f7','f6'],['e5','f6'],['g7','f6'],['g5','f6'],['g8','f6']];
S['pp-captures']=async(b)=>{await S['pp-m0'](b);for(const [f,t] of CAPTURES)await b.move(f,t,220);await b.settle(500);};
S['k10']=async(b)=>{await b.card('k10',12000);await ensureMovesShown(b);};

module.exports={states:S,tapBtn,plies,waitPlies,status,movesShown,ensureMovesShown,scrollers,scrollSheetTop,textRect,btnRects,closeSheet,CAPTURES,
  notes:'Home -> Play tile opens the New Game sheet (a fixed overlay that scrolls; it remembers the last opponent, colour and clock, so every setup state taps them). Bots are buttons "Pip\\n≈ 500 Elo" in a sideways-scrolling row; ▶ Start game sits below the fold on a 679px-tall phone with Computer selected (tapBtn scrolls it into view). In a live game: moves are piece-tap then target-tap (b.move); the engine reply is awaited by counting plies in data-ct play-moverow (waitPlies); Pass & Play flips the board to the side to move after every ply. The Moves button HIDES the move list (shown on a fresh load) and the hidden state persists across games, so the start states call ensureMovesShown. More opens a bottom sheet (New game, Resign while live); Resign ends the game at once (no confirm). Game over keeps the live chrome, Hint/Flip become Review/Rematch. Online -> Continue lands on a sign-in screen with no way back except a reload (b.home() handles it).'};
