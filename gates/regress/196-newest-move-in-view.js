// gates/regress/196-newest-move-in-view.js - EVERY MOVE LIST KEEPS THE NEWEST MOVE IN VIEW; DRILL ANALYSIS LISTS THE MOVES HE PLAYS
// #553, batch 14 entry 28, jobs/every-move-list-keeps-the-newest-move-in-view-and-drill-analysis-lists-your-moves-2026-11-19, story US-R206,
// cases TC-R294..TC-R297. Amber flags/amber-553-drill-analysis-moves.
// THE CARD CARRIES NO 'played' MOVE ON PURPOSE: the home screen's regrade (chess.jsx, ct_regrade550) re-scores a card's played move and DROPS
// it when the engine calls it no Mistake or Blunder, which would empty the drill before the gate reached it.
//
// WHY: Kunal, Thu 19 Nov 2026, on Analysis opened from a drill card: "Why is there this empty black bar at the bottom of the board?" and
// "when I do play a move the move list just stays where it is ... The last move should kind of come into screen ... the older moves should
// start scrolling out towards the left of the screen to accommodate the new moves on the right." He picked "Box lists my moves
// (Recommended)": the moves he plays fill the box, newest always in view, older ones scrolling off left, tap one to go back to it, hidden
// until his first move; the line under it stays, labelled "Engine's best line", and wraps instead of running off.
//
// WHAT IT READS: the bundle under test (CT_APP), AFTER interaction, on LONG games (84 plies = 42 moves), at kunal761 (375x761, ct_safe 51,31),
// 320x568 (se) and sideways 761x375. "In view" is measured, never read from source: the newest (or current) move's own chip rect must lie
// inside its scroller's visible box (the scroller's rect less its borders, i.e. what clientWidth/clientHeight show) AND inside the
// viewport - "below the fold is not unreachable" is why the SPECIFIC chip is asserted against its own scroller, not the page.
//  TC-R294 drill Analysis (a mistakes card at the start position, solved with 1.e4, then Analyze): before his first move the box is laid
//          out but invisible (it keeps its height); after EACH of 84 moves the box lists exactly the moves played, the newest is named by
//          its SAN (from a node replay of the same moves), marked current and fully in view; the board's top and width never change.
//  TC-R295 drill Analysis, going back: a tap on move 10 puts the board on the position after move 10 (painted squares against the node
//          replay), marks it current and in view, and keeps the 74 later moves, dimmed; a tap on the last one goes forward again; Undo
//          steps back one keeping the undone move dimmed, and playing that move again takes it forward (nothing duplicated).
//  TC-R296 drill Analysis, the engine's line: a caption "Engine's best line" above it, and the line wraps inside the screen - no
//          sideways overflow in the row, its last move inside the viewport.
//  TC-R297 Pass & Play (the Play screen's move list; vs Computer and Coach render the same list) and Review (the same 84 plies
//          imported, stepped forward through every ply, then First and Last): after each move or step the newest / current move is
//          fully in view in every move list on screen. Where the list is a sheet (a short phone), the sheet is opened every 21 plies.
// KNOW ITS LIMIT: headless Chromium; Coach and vs Computer are not driven here (they render the Play screen's list, measured by gate 170
// for Coach's own marks); Review analysis keeps the game's moves in its box (current = the ply he branched from) and is covered by the
// Review stepping, not by playing moves in it. His look on the phone is his.
// CT_196_GEOS=kunal761,se,land picks geometries; CT_196_PARTS=drill,play,review picks parts.
'use strict';
const L=require('../lib');
const E=require('../engine-extract');
const P=require('../drive/play');
const R=require('../drive/review');
// 84 plies from the start, no capture, no repetition, never 13 plies without a pawn move (so no fifty-move draw), no castling or promotion
const UCIS='g2g4 b7b5 f1g2 a7a6 e2e4 f7f5 e1e2 g7g5 a2a4 d7d5 b1a3 e8d7 a1a2 c8b7 g2f1 d7d6 a4a5 d5d4 e2d3 d6e5 f1g2 b7d5 c2c3 b5b4 d1c2 h7h5 f2f3 f8h6 c3c4 e5d6 c2b3 d8c8 c4c5 d6d7 h2h4 d5e6 a3b1 b8c6 e4e5 e6f7 f3f4 c8f8 b3a3 a8b8 g2f3 f8e8 a3a4 b8a8 a2a3 e8f8 g1e2 f7e8 h1g1 b4b3 f3h1 a8a7 a3a1 e8g6 a4a3 f8f7 a1a2 a7a8 h1e4 d7e8 e2c3 f7g7 e5e6 a8a7 e4d5 g7e5 d5f3 e5f6 a3b4 h6g7 c3a4 a7a8 f3h1 g6f7 b4b8 c6d8 c5c6 f6e5 h1d5 h8h7'.split(' ');
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// the node replay: positions after each ply and the SAN of each
const REP=(()=>{let g=E.fromFEN(START);const pos=[g],san=[];for(const u of UCIS){const m=E.getLegal(g).find(x=>E.rc2sq(x.fr,x.fc)+E.rc2sq(x.tr,x.tc)===u);if(!m)throw new Error('illegal '+u);g=E.makeMove(g,m);pos.push(g);san.push(g.history[g.history.length-1].san);}return {pos,san};})();
const occOf=(g)=>{const o=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(g.board[r][c])o.push(r*8+c);return o.join(',');};
const PGN='[Event "gate 196"]\n[White "A"]\n[Black "B"]\n[Result "*"]\n\n'+REP.san.map((s,i)=>(i%2===0?(i/2+1)+'. ':'')+s).join(' ')+' *\n';
const GEO={kunal761:{geo:'kunal761',tag:'kunal761'},se:{geo:'se',tag:'320x568'},land:{geo:{w:761,h:375,safe:'',label:'761x375'},tag:'761x375'}};
const MOVE_WAIT=+(process.env.CT_196_WAIT||260);

// IN THE PAGE: is element `el` fully inside its nearest scrolling ancestor's visible box, on each axis, and inside the viewport?
const IN_VIEW_SRC=`(el)=>{if(!el)return {ok:false,why:'no element'};const r=el.getBoundingClientRect();if(r.width<1||r.height<1)return {ok:false,why:'not laid out'};
  const R1=(x)=>Math.round(x*10)/10;const out={chip:{l:R1(r.left),r:R1(r.right),t:R1(r.top),b:R1(r.bottom)},boxes:[]};let ok=r.left>=-0.5&&r.right<=innerWidth+0.5&&r.top>=-0.5&&r.bottom<=innerHeight+0.5;
  if(!ok)out.why='outside the viewport';
  for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const st=getComputedStyle(p);const sx=p.scrollWidth>p.clientWidth+1&&st.overflowX!=='visible',sy=p.scrollHeight>p.clientHeight+1&&st.overflowY!=='visible';
    if(!sx&&!sy)continue;const q=p.getBoundingClientRect();const L0=q.left+p.clientLeft,T0=q.top+p.clientTop,R0=L0+p.clientWidth,B0=T0+p.clientHeight;
    const inX=!sx||(r.left>=L0-0.5&&r.right<=R0+0.5),inY=!sy||(r.top>=T0-0.5&&r.bottom<=B0+0.5);out.boxes.push({ct:p.getAttribute('data-ct')||(p.hasAttribute('data-mstrip')?'mstrip':p.tagName),l:R1(L0),r:R1(R0),t:R1(T0),b:R1(B0),sl:Math.round(p.scrollLeft),st:Math.round(p.scrollTop),inX,inY});
    if(!(inX&&inY)){ok=false;out.why=(out.why||'')+' outside its scroller '+(out.boxes[out.boxes.length-1].ct);}}
  out.ok=ok;return out;}`;
const boardOf=(b)=>b.page.evaluate(()=>{const R1=(x)=>Math.round(x*10)/10;const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];
  if(!g)return null;const gr=g.getBoundingClientRect();const occ=[];[...g.children].slice(0,64).forEach((k,i)=>{if(k.querySelector('img'))occ.push(i);});return {top:R1(gr.top),w:R1(gr.width),flipped:false,occ};});
// the painted board's occupied squares in a1..h8 board order (r*8+c, r=0 is rank 8), whichever way it is flipped
const paintedOcc=async(b,flip)=>{const bd=await boardOf(b);if(!bd)return null;return bd.occ.map(i=>flip?63-i:i).sort((x,y)=>x-y).join(',');};

// ── TC-R294..296: drill Analysis ──────────────────────────────────────────────────────────────────────────────────────────────────
async function drill(G){
  const tag=G.tag;
  const b=await L.launch({geo:G.geo,name:'g196-drill-'+tag,store:{ct_pool:'3',ct_mymistakes:[{fen:START,no:1,uci:'e2e4',label:'Mistake',ts:1791000000000,last:null,why:'the centre is open',hint:'take the centre'}]}});
  await b.open();await b.tile('Review');await b.settle(700);
  let ok=true;try{await b.tapText(/find the move you missed/,{wait:1800});await b.move('e2','e4',900);await b.page.locator('[data-ct="drill-analyse"]').waitFor({state:'visible',timeout:15000});await b.tapCt('drill-analyse',1500);await b.page.locator('[data-ct="rev-row1"]').waitFor({state:'visible',timeout:10000});}catch(e){ok=false;}
  await b.settle(900);
  const rd=()=>b.page.evaluate((src)=>{const inView=eval(src);const s=document.querySelector('[data-mstrip]');const R1=(x)=>Math.round(x*10)/10;
    const ch=[...document.querySelectorAll('[data-ct="strip-ana-move"]')];const cur=ch.findIndex(x=>x.getAttribute('data-cur')==='1');
    const sr=s&&s.getBoundingClientRect();
    return {strip:s?{vis:getComputedStyle(s).visibility,h:R1(sr.height),w:R1(sr.width),ana:s.getAttribute('data-ana')}:null,n:ch.length,cur,ahead:ch.filter(x=>x.getAttribute('data-ahead')==='1').length,
      sans:ch.map(x=>(x.innerText||'').trim()),view:cur>=0?inView(ch[cur]):null,sx:document.documentElement.scrollWidth,vw:innerWidth};},IN_VIEW_SRC);
  // ── TC-R296 the engine's line (read twice: at move 10, where the engine's line is long, and at the end) ──
  const engChk=async(where,mustWrap)=>{
  await b.page.waitForFunction(()=>{const e=document.querySelector('[data-ct="rev-engline-moves"]');return !!e&&/[a-h][1-8].*[a-h][1-8].*[a-h][1-8]/.test(e.innerText||'');},null,{timeout:30000}).catch(()=>{});await b.settle(600);
  const eg=await b.page.evaluate(()=>{const R1=(x)=>Math.round(x*10)/10;const lb=document.querySelector('[data-ct="rev-engline-label"]'),row=document.querySelector('[data-ct="rev-engline"]'),mv=document.querySelector('[data-ct="rev-engline-moves"]');
    const rr=(e)=>{if(!e)return null;const q=e.getBoundingClientRect();return {l:R1(q.left),r:R1(q.right),t:R1(q.top),b:R1(q.bottom),h:R1(q.height)};};
    let last=null;if(mv&&mv.firstChild){const rg=document.createRange();rg.selectNodeContents(mv);const rs=[...rg.getClientRects()];if(rs.length){const q=rs[rs.length-1];last={r:R1(q.right),lines:new Set(rs.map(x=>Math.round(x.top))).size};}}
    // the width the line would need on ONE row (a nowrap copy, measured off-screen), against the room the row gives it
    let need=null;if(mv&&row){const c=mv.cloneNode(true);c.style.cssText='position:absolute;left:-9999px;top:0;white-space:nowrap;font:'+getComputedStyle(mv).font;document.body.appendChild(c);need=R1(c.getBoundingClientRect().width);c.remove();}
    const room=mv&&row?R1(row.getBoundingClientRect().right-mv.getBoundingClientRect().left):null;
    return {label:lb?(lb.innerText||'').trim():null,lbR:rr(lb),row:rr(row),moves:rr(mv),txt:mv?(mv.innerText||'').trim():'',sw:row?row.scrollWidth:0,cw:row?row.clientWidth:0,sh:row?row.scrollHeight:0,ch:row?row.clientHeight:0,last,need,room,vw:innerWidth};});
  L.say(eg.label==="Engine's best line"&&!!eg.lbR&&!!eg.row&&eg.lbR.b<=eg.row.t+3,'TC-R296 '+tag+' '+where+': the engine\'s line carries the caption "'+eg.label+'" on its own line above it',{label:eg.label,lb:eg.lbR,row:eg.row});
  const wraps=eg.need!=null&&eg.room!=null&&(eg.need<=eg.room+0.5||(eg.last&&eg.last.lines>=2));
  L.say(!!eg.moves&&/[a-h][1-8]/.test(eg.txt)&&eg.sw<=eg.cw+1&&eg.sh<=eg.ch+1&&eg.moves.r<=eg.vw+0.5&&!!eg.last&&eg.last.r<=eg.vw+0.5&&eg.row.r<=eg.vw+0.5&&wraps,'TC-R296 '+tag+' '+where+': the line stays inside the screen - no sideways or downward overflow in its row ('+eg.sw+'/'+eg.cw+', '+eg.sh+'/'+eg.ch+'), its last move ends at '+(eg.last&&eg.last.r)+' of '+eg.vw+' - on '+(eg.last&&eg.last.lines)+' line(s), needing '+eg.need+' on one row against '+eg.room+': "'+eg.txt.slice(0,70)+'"',eg);
  if(mustWrap)L.say(eg.need!=null&&eg.room!=null&&eg.need>eg.room&&!!eg.last&&eg.last.lines>=2,'TC-R296 '+tag+' '+where+': the line is longer than one row here ('+eg.need+' > '+eg.room+') and it WRAPS onto '+(eg.last&&eg.last.lines)+' lines',{need:eg.need,room:eg.room,last:eg.last});
  };
  const b0=await boardOf(b);const r0=await rd();
  if(!L.say(ok&&!!b0&&!!r0.strip,'TC-R294 PRECONDITION '+tag+' a mistakes card at the start position was solved with 1.e4 and opened on the analysis board, which has a board and a move box',{ok,strip:r0.strip})){await b.close();return;}
  L.say(r0.strip.vis==='hidden'&&r0.strip.h>=20&&r0.n===0,'TC-R294 '+tag+' before his first move the box is laid out ('+r0.strip.h+' tall) but invisible, and lists nothing - no empty black bar',{strip:r0.strip,n:r0.n});
  const flip=false;const occ0=await paintedOcc(b,flip);
  L.say(occ0===occOf(REP.pos[0]),'TC-R294 PRECONDITION '+tag+' the analysis board starts on the card\'s position (the start, painted squares match)',{got:occ0});
  let bad=[],boards=new Set([JSON.stringify([b0.top,b0.w])]),worst=null,stripH=new Set([r0.strip.h]);
  for(let i=0;i<UCIS.length;i++){
    await b.move(UCIS[i].slice(0,2),UCIS[i].slice(2,4),MOVE_WAIT);
    const r=await rd();const bd=await boardOf(b);boards.add(JSON.stringify([bd&&bd.top,bd&&bd.w]));stripH.add(r.strip&&r.strip.h);
    const good=r.strip&&r.strip.vis==='visible'&&r.n===i+1&&r.cur===i&&r.sans[i]===REP.san[i]&&r.ahead===0&&r.view&&r.view.ok;
    if(!good){bad.push({ply:i+1,n:r.n,cur:r.cur,san:r.sans[i],want:REP.san[i],vis:r.strip&&r.strip.vis,view:r.view});}
    if(r.view&&!r.view.ok&&!worst)worst=r.view;
  }
  L.say(bad.length===0,'TC-R294 '+tag+' after EACH of '+UCIS.length+' moves the box lists exactly the moves played, the newest named by its SAN, marked current and fully inside the box and the screen: '+(UCIS.length-bad.length)+' of '+UCIS.length,{bad:bad.slice(0,4),worst});
  const rEnd=await rd();
  L.say(!!rEnd.view&&rEnd.view.ok&&rEnd.view.boxes.some(x=>x.ct==='mstrip'&&x.sl>0),'TC-R294 '+tag+' at move 42 the box has scrolled (scrollLeft '+(rEnd.view&&rEnd.view.boxes.map(x=>x.sl).join('/'))+'): the older moves went off to the left and the newest, '+REP.san[UCIS.length-1]+', is in view',{view:rEnd.view});
  L.say(boards.size===1&&stripH.size===1,'TC-R294 '+tag+' the board\'s top and width ('+[...boards].join(' ')+') and the box\'s height ('+[...stripH].join(' ')+') are the same before his first move and after every one',{boards:[...boards],stripH:[...stripH]});
  // ── TC-R295 going back and forward ──
  await b.page.locator('[data-ct="strip-ana-move"]').nth(9).click();await b.settle(700);
  let r=await rd();let occ=await paintedOcc(b,flip);
  L.say(r.cur===9&&r.n===UCIS.length&&r.ahead===UCIS.length-10&&occ===occOf(REP.pos[10])&&r.view&&r.view.ok,'TC-R295 '+tag+' a tap on move 10 ('+REP.san[9]+') puts the board on the position after it (painted squares match the replay: '+(occ===occOf(REP.pos[10]))+'), marks it current and in view, and keeps the '+r.ahead+' later moves, dimmed',{cur:r.cur,n:r.n,ahead:r.ahead,view:r.view});
  await engChk('at move 10',G.geo==='se');   // at 320 the line at move 10 needs more than one row (measured: 375 wide it fits on one)
  await b.page.locator('[data-ct="strip-ana-move"]').nth(UCIS.length-1).click();await b.settle(700);
  r=await rd();occ=await paintedOcc(b,flip);
  L.say(r.cur===UCIS.length-1&&r.ahead===0&&occ===occOf(REP.pos[UCIS.length])&&r.view&&r.view.ok,'TC-R295 '+tag+' a tap on the last move goes forward again: the final position, current and in view, nothing dimmed',{cur:r.cur,ahead:r.ahead,view:r.view});
  try{await b.tapText(/Undo/,{wait:600});}catch(e){}
  r=await rd();occ=await paintedOcc(b,flip);
  L.say(r.cur===UCIS.length-2&&r.ahead===1&&r.n===UCIS.length&&occ===occOf(REP.pos[UCIS.length-1])&&r.view&&r.view.ok,'TC-R295 '+tag+' Undo steps back one: move '+(UCIS.length-1)+' is current and in view and the undone '+REP.san[UCIS.length-1]+' stays in the box, dimmed',{cur:r.cur,ahead:r.ahead,n:r.n});
  const u=UCIS[UCIS.length-1];await b.move(u.slice(0,2),u.slice(2,4),700);
  r=await rd();
  L.say(r.cur===UCIS.length-1&&r.ahead===0&&r.n===UCIS.length&&r.sans[UCIS.length-1]===REP.san[UCIS.length-1],'TC-R295 '+tag+' playing that move again takes it forward: '+r.n+' moves, nothing duplicated, nothing dimmed',{cur:r.cur,ahead:r.ahead,n:r.n});
  await engChk('at the end',false);
  L.say(r.sx<=r.vw+1,'TC-R296 '+tag+' no sideways page scroll',{sx:r.sx,vw:r.vw});
  L.say(b.errs.length===0,'TC-R294 '+tag+' no console errors',{errs:b.errs.slice(0,2)});
  await b.close();
}

// IN THE PAGE: every VISIBLE move list's chip for the newest SAN (the last chip in that list), checked in view
const LISTS_SRC=`(want)=>{const inView=eval(${JSON.stringify(IN_VIEW_SRC)});const vis=(e)=>{for(let p=e;p&&p!==document.body;p=p.parentElement){const st=getComputedStyle(p);if(st.visibility==='hidden'||st.display==='none')return false;if(st.clipPath==='inset(50%)')return false;}const q=e.getBoundingClientRect();return q.width>1&&q.height>1;};
  const lists=[...document.querySelectorAll('[data-ct="moves-panel"],[data-ct="play-moverow"],[data-mstrip]')].filter(vis);
  return lists.map(li=>{const leaves=[...li.querySelectorAll('span,b')].filter(e=>e.children.length===0&&(e.innerText||'').trim()===want&&vis(e));const el=leaves[leaves.length-1];
    return {list:li.getAttribute('data-ct')||'mstrip',found:!!el,view:el?inView(el):null};});}`;

// ── TC-R297 Pass & Play ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function play(G){
  const tag=G.tag;const b=await L.launch({geo:G.geo,name:'g196-pp-'+tag,store:{ct_pool:'3'}});await b.open();
  let ok=true;try{await P.states['pp-m0'](b);}catch(e){ok=false;}
  const sheet=await P.movesSheet(b);
  const lists=(want)=>b.page.evaluate((a)=>eval(a[0])(a[1]),[LISTS_SRC,want]);
  let bad=[],checked=0,listNames=new Set();
  for(let i=0;i<UCIS.length;i++){
    await b.move(UCIS[i].slice(0,2),UCIS[i].slice(2,4),MOVE_WAIT);
    // Pass & Play turns the board to the side to move; b.move reads the painted board, so it taps the right squares either way
    let opened=false;if(sheet&&(i%21===20||i===UCIS.length-1)){await P.tapBtn(b,/^Moves$/,500);opened=true;}
    if(!sheet||opened){await b.settle(250);const ls=await lists(REP.san[i]);checked++;ls.forEach(x=>listNames.add(x.list));
      const good=ls.length>0&&ls.every(x=>x.found&&x.view&&x.view.ok);if(!good)bad.push({ply:i+1,san:REP.san[i],ls});}
    if(opened){await P.tapBtn(b,/^Moves$/,400);}
  }
  const plies=await P.plies(b).catch(()=>-1);
  L.say(ok&&plies===UCIS.length,'TC-R297 PRECONDITION '+tag+' Pass & Play: all '+UCIS.length+' plies were played ('+plies+')'+(sheet?' (the move list is a sheet here, opened every 21 plies)':''),{plies,sheet});
  L.say(checked>0&&bad.length===0,'TC-R297 '+tag+' Pass & Play: after each move ('+checked+' readings) the newest move is fully in view in every move list on screen ('+[...listNames].join(', ')+')',{bad:bad.slice(0,3)});
  // stepping back: the current move (the last one the list shows) stays in view
  let sb=[];for(let k=0;k<3;k++){try{await P.tapBtn(b,/^Back$/,350);}catch(e){}}
  if(sheet)await P.tapBtn(b,/^Moves$/,500);
  {const ls=await lists(REP.san[UCIS.length-4]);if(!(ls.length>0&&ls.every(x=>x.found&&x.view&&x.view.ok)))sb.push(ls);
   // and the steps were taken: the last move (its SAN occurs once in the game) is no longer in any list
   const gone=await lists(REP.san[UCIS.length-1]);if(REP.san.filter(x=>x===REP.san[UCIS.length-1]).length!==1||gone.some(x=>x.found))sb.push({stillShown:REP.san[UCIS.length-1],gone});}
  L.say(sb.length===0,'TC-R297 '+tag+' Pass & Play: three steps Back (the last move leaves the list), the current move ('+REP.san[UCIS.length-4]+') is in view in every move list on screen',{sb});
  L.say(b.errs.length===0,'TC-R297 '+tag+' Pass & Play: no console errors',{errs:b.errs.slice(0,2)});
  await b.close();
}

// ── TC-R297 Review ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function review(G){
  const tag=G.tag;const b=await L.launch({geo:G.geo,name:'g196-rev-'+tag,store:{ct_pool:'3'}});await b.open();
  let ok=true;try{await R.importPgn(b,PGN,300000);await R.startReview(b);}catch(e){ok=false;}
  const cur=()=>b.page.evaluate((src)=>{const inView=eval(src);const s=document.querySelector('[data-mstrip]');if(!s)return null;const ch=[...s.querySelectorAll('span[role="button"]')];const c=ch.find(x=>/bold|700/.test(getComputedStyle(x).fontWeight));
    return {n:ch.length,idx:c?ch.indexOf(c):-1,san:c?(c.innerText||'').trim():null,view:c?inView(c):null};},IN_VIEW_SRC);
  const c0=await cur();
  L.say(ok&&!!c0&&c0.n===UCIS.length,'TC-R297 PRECONDITION '+tag+' Review: the same '+UCIS.length+' plies imported and opened move by move ('+(c0&&c0.n)+' moves in the box)',{c0});
  let bad=[];const fwd=async()=>{const v=b.page.locator('button[aria-label="Next move"]:visible');if(await v.count())await v.last().click();else await b.page.keyboard.press('ArrowRight');};   // sideways there is no Next button (the toolbar is First / Play / Last); the review's own arrow key steps
  for(let i=0;i<UCIS.length&&ok;i++){await fwd();await b.settle(380);const c=await cur();if(!(c&&c.idx===i&&c.san&&c.san.indexOf(REP.san[i])===0&&c.view&&c.view.ok))bad.push({ply:i+1,c});}
  L.say(ok&&bad.length===0,'TC-R297 '+tag+' Review: stepping forward through all '+UCIS.length+' plies, the current move is marked and fully in view in the box after every step',{bad:bad.slice(0,3)});
  let fl=[];for(const t of ['First move','Last move']){try{await R.navTap(b,t);}catch(e){}await b.settle(2500);/* the box scrolls SMOOTHLY: 84 plies is about 5000px, which Chromium animates for over a second (measured: mid-way at 900 ms) */const c=await cur();if(t==='Last move'&&!(c&&c.idx===UCIS.length-1&&c.view&&c.view.ok))fl.push({t,c});}
  L.say(fl.length===0,'TC-R297 '+tag+' Review: after First then Last the last move is current and in view',{fl});
  L.say(b.errs.length===0,'TC-R297 '+tag+' Review: no console errors',{errs:b.errs.slice(0,2)});
  await b.close();
}

L.run(async()=>{
  console.log('# '+UCIS.length+' plies; the node replay read chess.jsx md5 '+E.SOURCE_MD5+'; last SANs '+REP.san.slice(-4).join(' '));
  const geos=(process.env.CT_196_GEOS||'kunal761,se,land').split(',');const parts=(process.env.CT_196_PARTS||'drill,play,review').split(',');
  for(const g of geos){const G=GEO[g];if(!G)throw new Error('unknown geometry '+g);
    if(parts.includes('drill'))await drill(G);
    if(parts.includes('play'))await play(G);
    if(parts.includes('review'))await review(G);}
},'196-newest-move-in-view');
