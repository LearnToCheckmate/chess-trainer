// gates/regress/195-mate-line-on-the-board.js - WHEN A DRILL CARD SAYS MATE IN N, THE MOVES PLAY ON THE BOARD, CHECKED
// #553, batch 14 entry 27, jobs/when-the-app-says-mate-in-n-show-the-moves-on-the-board-2026-11-19, story US-R205, cases TC-R290..TC-R293. Amber flags/amber-553-mate-line-player.
//
// WHY: Kunal, about 7:50pm EST Thu 19 Nov 2026, on a Puzzles card reading "You gave up the knight on g5. If Kxg5, Qd2+ and it is mate in 4.":
// "you should also then show me if it's made in 4, how it's made in 4, because now I don't know."
// THE FIX: a solved drill card whose message claims a mate in N carries Play (a circled solid triangle) once the engine's line from the
// board passes chess.jsx mateLineCheck; Play steps the line onto the board one move per tap, forward and back, the box naming each move,
// and the curled arrow returns to the position after his move.
//
// TWO PARTS.
//  N (node, no browser), TC-R290: THE CHECK, OVER MANY POSITIONS. gates/fixtures/mate-lines.json holds 411 engine lines from
//    gates/measure-mate-lines.js (every mate-in-N puzzle of the app's pool, both shapes, and Kunal's card). Each is re-run through the
//    SHIPPED mateLineCheck (engine-extract): every one must pass, and for every one three broken copies must be REFUSED - the last move
//    dropped, N claimed one higher, an illegal move put in. Independently of the function under test, each accepted line is replayed here
//    with findMoveBySAN on its own SANs and its last position must be checkmate with the mating side's moves numbering N. mateClaim reads his
//    sentence as N 4 with the reply Kxg5, and refuses an "allows mate" sentence.
//  B (browser), TC-R291..TC-R293: THE WIRING, on Kunal's phone (kunal761) and 320x568, his card seeded in the brilliant-moves drill:
//    TC-R291 before his move there is no Play; after 1.Ng5 Play appears, named "Show the mate in 4", beside Analyze and Reset.
//    TC-R292 Play, then forward to the end: at EVERY step the board's occupied squares are the ones a replay of the box's own line (its
//            SANs, numbered) gives from the position after 1.Ng5 - an independent reading of the painted board, not of the app's state -
//            the box names the move on the board first ("k of 8: ..."), the line is 8 plies (the reply Kxg5, then 2N-1=7), its last move is
//            mate in the replay, and the mating side moved exactly 4 times. Then back to the start: the board is the position after
//            his move again; the curled arrow ends the line, Play is back and the message is his sentence again.
//    TC-R293 the board rule: the board's top and width, the drill row's box and the message box are the same in every state above;
//            no sideways scroll; the step arrows are disabled at the ends; and a second card that claims a mate the position does not
//            have ("It is mate in 2." on a queen-up ending with no mate in two) shows NO Play. No console errors.
// KNOW ITS LIMIT: headless Chromium, the single-thread engine; the line the engine picks may differ between runs (2...Kf6 or 2...Bf4 on
// his card) - so the gate pins the CHECK (legal, mate, length N), never one line. His look on the phone is his.
// CT_195_NODE_ONLY=1 runs part N alone; CT_195_GEOS=kunal761,se picks part B's geometries.
'use strict';
const fs=require('fs'),path=require('path');
const L=require('../lib');
const E=require('../engine-extract');
const FIX=JSON.parse(fs.readFileSync(path.join(__dirname,'..','fixtures','mate-lines.json'),'utf8'));
const HIS='You gave up the knight on g5. If Kxg5, Qd2+ and it is mate in 4.';
const CARDS=[{fen:'r2qr3/1ppb1p1R/p1nbpk2/8/3P4/2PB1N2/PPQ2PPP/R5K1 w - - 0 1',uci:'f3g5',label:'Brilliant',ts:1791000000000,last:null,why:HIS},
             {fen:'4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1',uci:'b2b7',label:'Brilliant',ts:1791000001000,last:null,why:'Card W. It is mate in 2.'}];
const AFTER='r2qr3/1ppb1p1R/p1nbpk2/6N1/3P4/2PB4/PPQ2PPP/R5K1 b - - 0 1';

// the replay of a line read off the screen, by the SANs alone (move numbers stripped), from `fen`: occupied squares after each ply
function replay(fen,words){
  let g=E.fromFEN(fen);const occ=[],sans=[];
  for(const w of words){const san=String(w).replace(/^\d+(\.|…)/,'');const m=E.findMoveBySAN(g,san);if(!m)return {bad:'not a legal move here: '+w};g=E.makeMove(g,m);sans.push(san);occ.push(occOf(g));}
  return {occ,last:g,sans};
}
function occOf(g){const o=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(g.board[r][c])o.push(r*8+c);return o.join(',');}

function partN(){
  console.log('# part N: '+FIX.rows.length+' lines; '+FIX.about+'; checked by chess.jsx md5 '+E.SOURCE_MD5);
  let pass=0,ctl=0,badPass=[],badCtl=[],badReplay=[];
  for(const r of FIX.rows){
    const g=E.fromFEN(r.fen);const c=E.mateLineCheck(g,r.ucis,r.n,r.lead);
    if(c.ok)pass++;else badPass.push(r.tag+' '+c.why);
    const ill=r.ucis.slice();ill[Math.max(r.lead,r.ucis.length-2)]='a1a1';
    const cs=[E.mateLineCheck(g,r.ucis.slice(0,-1),r.n,r.lead),E.mateLineCheck(g,r.ucis,r.n+1,r.lead),E.mateLineCheck(g,ill,r.n,r.lead)];
    cs.forEach((x,i)=>{if(x.ok)badCtl.push(r.tag+' copy '+i);else ctl++;});
    const rp=replay(r.fen,r.sans);let mover=0;
    if(!rp.bad){const side=E.fromFEN(r.fen).turn,other=side==='w'?'b':'w';const ms=rp.sans.map((_,i)=>i%2===0?side:other);const mateBy=ms[ms.length-1];mover=ms.slice(r.lead).filter(x=>x===mateBy).length;}
    if(rp.bad||E.getStatus(rp.last)!=='checkmate'||mover!==r.n)badReplay.push(r.tag+' '+(rp.bad||('mate '+(rp.last&&E.getStatus(rp.last))+', mover moves '+mover)));
  }
  L.say(FIX.rows.length>=400&&badPass.length===0,'TC-R290 '+pass+' of '+FIX.rows.length+' engine mate lines (243 puzzle mates, 168 reply-then-mate, Kunal\'s card) pass the shipped mateLineCheck',{badPass:badPass.slice(0,5)});
  L.say(badCtl.length===0&&ctl===FIX.rows.length*3,'TC-R290 all '+ctl+' broken copies refused (the last move dropped, N+1 claimed, an illegal move): accepted by mistake '+badCtl.length,{badCtl:badCtl.slice(0,5)});
  L.say(badReplay.length===0,'TC-R290 independently of mateLineCheck: each line replayed from its own SANs ends in checkmate with the mating side moving exactly N times ('+(FIX.rows.length-badReplay.length)+' of '+FIX.rows.length+')',{badReplay:badReplay.slice(0,5)});
  const k=FIX.rows.find(r=>r.tag==='kunal');
  L.say(!!k&&k.n===4&&k.lead===1&&k.sans[0]==='Kxg5'&&/#$/.test(k.sans[k.sans.length-1])&&k.sans.length===8,'TC-R290 Kunal\'s card is in the set: '+(k?k.sans.join(' '):'absent'),{k});
  const c1=E.mateClaim(HIS),c2=E.mateClaim('It allows mate in two: Qxh7+ Kxh7 Rh3#.'),c3=E.mateClaim('Black missed a mate in two that starts Qh4.'),c4=E.mateClaim('Hard to see, and it holds.');
  L.say(!!c1&&c1.n===4&&c1.reply==='Kxg5'&&c2===null&&!!c3&&c3.n===2&&c3.reply===null&&c4===null,'TC-R290 mateClaim: his sentence -> '+JSON.stringify(c1)+'; "allows mate in two" -> '+JSON.stringify(c2)+' (a mate against the praised side is no line from this board); "missed a mate in two" -> '+JSON.stringify(c3)+'; no claim -> '+JSON.stringify(c4),{c1,c2,c3,c4});
}

async function partB(geo,tag){
  const b=await L.launch({geo,name:'mate-line-'+tag,store:{ct_mybrilliancies:CARDS,ct_bril_reset_v1:'1',ct_bril_lib:'0',ct_pool:'3'}});
  await b.open();await b.tile('Review');await b.settle(700);
  let ok=true;try{await b.tapText(/can you spot them again\?/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});}catch(e){ok=false;}
  await b.settle(900);
  const rd=()=>b.page.evaluate(()=>{const R=(x)=>Math.round(x*10)/10;
    const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
    const gr=g&&g.getBoundingClientRect();const occ=[];if(g)[...g.children].slice(0,64).forEach((k,i)=>{if(k.querySelector('img'))occ.push(i);});
    const rr=(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {top:R(r.top),h:R(r.height),w:R(r.width)};};
    const btn=(s)=>{const e=document.querySelector('[data-ct="'+s+'"]');if(!e)return null;const r=e.getBoundingClientRect();return {vis:r.width>0&&getComputedStyle(e).visibility!=='hidden',dis:e.disabled,label:e.getAttribute('aria-label')};};
    const say=document.querySelector('[data-ct="pz-line-say"]');const mv=[...document.querySelectorAll('[data-ct="pz-line-move"]')];
    return {board:gr?{top:R(gr.top),w:R(gr.width)}:null,occ:occ.join(','),row:rr('[data-ct="drill-row"]'),msg:rr('[data-ct="pz-msg"]'),
      msgText:(document.querySelector('[data-ct="pz-msg-text"]')||{}).innerText||'',say:say?say.innerText.trim():null,moves:mv.map(m=>m.innerText.trim()),cur:mv.findIndex(m=>m.getAttribute('data-cur')==='1'),
      play:btn('pz-line-play'),back:btn('pz-line-back'),fwd:btn('pz-line-fwd'),reset:btn('pz-line-reset'),analyse:btn('drill-analyse'),vw:innerWidth,sx:document.documentElement.scrollWidth};});
  const r0=await rd();
  if(!L.say(ok&&!!r0.board,'TC-R291 PRECONDITION '+tag+' the brilliant-moves drill opened on his card with a board',{ok})){await b.close();return;}
  await b.page.waitForTimeout(1500);const r0b=await rd();
  L.say(!r0b.play,'TC-R291 '+tag+' before his move there is no Play control',{play:r0b.play});
  await b.move('f3','g5',900);
  let shown=true;try{await b.page.locator('[data-ct="pz-line-play"]').waitFor({state:'visible',timeout:25000});}catch(e){shown=false;}
  const r1=await rd();
  L.say(shown&&!!r1.play&&r1.play.label==='Show the mate in 4'&&!!r1.analyse&&r1.analyse.vis&&/If Kxg5, Qd2\+ and it is mate in 4/.test(r1.msgText),'TC-R291 '+tag+' after 1.Ng5 the solved card offers Play named "'+(r1.play&&r1.play.label)+'" beside Analyze, under his sentence',{play:r1.play,msg:r1.msgText.slice(0,90)});
  const geoms=[r1];
  if(!shown){await b.close();return;}
  const occAfter=occOf(E.fromFEN(AFTER));
  L.say(r1.occ===occAfter,'TC-R292 PRECONDITION '+tag+' the painted board is the position after 1.Ng5 (occupied squares match a replay)',{got:r1.occ,want:occAfter});
  await b.tapCt('pz-line-play',500);let r=await rd();geoms.push(r);
  const words=r.moves.slice();const rp=replay(AFTER,words);
  L.say(!rp.bad&&words.length===8&&/^1…Kxg5$/.test(words[0])&&/#$/.test(words[7])&&E.getStatus(rp.last)==='checkmate','TC-R292 '+tag+' the box\'s line, replayed from the board by its own SANs, is 8 plies - Kxg5 and White\'s mate in 4 - and ends in checkmate: '+words.join(' '),{words,bad:rp.bad});
  const wm=rp.sans?rp.sans.slice(1).filter((_,i)=>i%2===0).length:0;
  L.say(wm===4,'TC-R292 '+tag+' the mating side moves exactly 4 times after the reply ('+wm+')',{wm});
  let stepsOk=0,stepBad=[];
  for(let i=0;i<8;i++){
    if(i>0){await b.tapCt('pz-line-fwd',350);r=await rd();geoms.push(r);}
    const good=!rp.bad&&r.occ===rp.occ[i]&&r.cur===i&&r.say&&r.say.indexOf((i+1)+' of 8: ')===0&&r.say.indexOf(rp.sans[i])>0;
    if(good)stepsOk++;else stepBad.push({i,occ:r.occ===(rp.occ&&rp.occ[i]),cur:r.cur,say:r.say});
  }
  L.say(stepsOk===8,'TC-R292 '+tag+' one move per tap, forward: at each of the 8 steps the painted board matches the replay, the move is marked in the line and named first in the box ("k of 8: ..."): '+stepsOk+' of 8; last: "'+r.say+'"',{stepBad});
  L.say(!!r.say&&/is checkmate\.$/.test(r.say)&&r.fwd&&r.fwd.dis&&r.back&&!r.back.dis,'TC-R293 '+tag+' at the end the box says checkmate and forward is disabled, back is not',{say:r.say,fwd:r.fwd,back:r.back});
  let backOk=0;for(let i=6;i>=-1;i--){await b.tapCt('pz-line-back',300);r=await rd();geoms.push(r);if(r.occ===(i<0?occAfter:rp.occ[i])&&r.cur===i)backOk++;}
  L.say(backOk===8&&r.back&&r.back.dis&&/position after your move/.test(r.say||''),'TC-R292 '+tag+' back, one move per tap, to the position after his move (board matches at '+backOk+' of 8 steps; back disabled there: '+(r.back&&r.back.dis)+')',{say:r.say});
  await b.tapCt('pz-line-fwd',300);await b.tapCt('pz-line-fwd',300);await b.tapCt('pz-line-reset',500);r=await rd();geoms.push(r);
  L.say(r.occ===occAfter&&!!r.play&&r.play.vis&&!r.back&&/If Kxg5, Qd2\+ and it is mate in 4/.test(r.msgText),'TC-R292 '+tag+' the curled arrow ends the line: the board is the position after his move, Play and Analyze are back and the box holds his sentence again',{occ:r.occ===occAfter,play:r.play,msg:r.msgText.slice(0,80)});
  const same=(k,f)=>geoms.every(x=>JSON.stringify(f(x))===JSON.stringify(f(geoms[0])));
  L.say(same('b',x=>x.board)&&same('r',x=>x.row)&&same('m',x=>x.msg),'TC-R293 '+tag+' the board (top '+r1.board.top+', width '+r1.board.w+'), the drill row and the message box are the same in all '+geoms.length+' states',{boards:[...new Set(geoms.map(x=>JSON.stringify(x.board)))],rows:[...new Set(geoms.map(x=>JSON.stringify(x.row)))],msgs:[...new Set(geoms.map(x=>JSON.stringify(x.msg)))]});
  L.say(geoms.every(x=>x.sx<=x.vw+1),'TC-R293 '+tag+' no sideways scroll in any state',{sx:geoms.map(x=>x.sx)});
  // a card that claims a mate the position does not have: no Play
  let nx=true;try{await b.page.locator('[data-ct="drill-next"]').click();}catch(e){nx=false;}await b.settle(1200);
  await b.move('b2','b7',900);await b.page.waitForTimeout(9000);const rw=await rd();
  L.say(nx&&/It is mate in 2/.test(rw.msgText)&&!!rw.analyse&&rw.analyse.vis&&!rw.play,'TC-R293 '+tag+' a card claiming "mate in 2" where the engine\'s line is no mate in two is solved and shows NO Play after 9 s (the check refused it)',{nx,msg:rw.msgText.slice(0,60),play:rw.play});
  L.say(b.errs.length===0,'TC-R293 '+tag+' no console errors',{errs:b.errs.slice(0,2)});
  await b.close();
}

L.run(async()=>{
  partN();
  if(process.env.CT_195_NODE_ONLY)return;
  const geos=(process.env.CT_195_GEOS||'kunal761,se').split(',');
  for(const gname of geos)await partB(gname,gname==='se'?'320x568':gname);
},'195-mate-line-on-the-board');
