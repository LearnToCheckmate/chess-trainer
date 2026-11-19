'use strict';
// gates/regress/170-coach-mode.js - COACH MODE: A GAME AGAINST THE APP'S OWN COMPUTER WITH A TEACHER'S NOTES, HINTS, TAKEBACKS AND THE
// ENGINE'S VIEW ON REQUEST, SAVED WITH ITS NOTES AND OPENED IN REVIEW WITH THEM - AND NOWHERE ELSE.
// US-R164 / TC-R235a..j.
//
// WHY [batch 13; jobs/coach-mode-a-game-against-the-app-with-a-teachers-notes-hints-takebacks-and-the-engine-on-request-2026-11-03;
// Kunal's answer questions/CHESSCOM-GAMES 'Both', 3 Nov 2026]: he wants coaching inside a live game as a training exercise with a
// teacher, and the app's own games are where that wrongs nobody. Nothing of it existed.
// WHAT IT READS: the bundle under test (CT_APP), at 375x761+51,31 (kunal761) and 320x568 (se), AFTER interaction - a coach game is
// started from the New Game sheet, four plies are played, two notes are written, a hint is asked for, the engine's view is opened, a
// move is taken back, two more plies are played, the game is resigned and opened in Review, and then opened again from More > Saved coach games.
// THE BOARD: its rect (left, top, width) is read before the first control is used and after each one; every reading must be the same.
// THE GUARD (TC-R235j): the New Game sheet has no Coach row for Pass & Play or Online; a Pass & Play game started while Coach mode
// is still switched on carries no coach row, no note mark and no engine text; nor does a computer game started with it off.
// HOW A LINE IS FOUND: by what the screen says or by a data-ct the PLAYER'S route reaches; TC-R235g reads the saved game out of the
// phone's own store (ct_coachgames) and TC-R235h/i read the note back off the Review screen, so the store is not its own witness.
// KNOW ITS LIMIT: (1) no LIVE ONLINE game is entered - the harness has no second player; the guard is measured on the Online sheet and
// its sign-in screen, and on a Pass & Play game. The More sheet itself is not rendered for an online game (chess.jsx, the sheet's own
// `opponent!=='online'`), which is read from source and not measured here. (2) The engine's view is checked for SHAPE (an evaluation
// and a legal-looking move) and for WHEN it shows, not for the quality of the move. (3) One opponent (Pip), one colour (White).
// CT_G170_GEO=kunal761|se runs one geometry.
// CONTROL-RECORD: 89c4ccf6 2026-11-19 total=93 red=6 scope=trial:fcfab98b3d3e how=batch 13 pair break guard-dropped: coachLive and Start stop asking who the opponent is - a Pass & Play game started with the switch on has the Note row and the Engine's view and is saved as a coach game; three TC-R235j lines red at each size; the real tree 52eb63c4578a 93/0
// CONTROL-RECORD: 89c4ccf6 2026-11-19 total=93 red=12 scope=trial:10c720ac3262 how=batch 13 pair break notes-not-saved: playedPgn is handed no notes - TC-R235g (the store's PGN has no comment), three TC-R235h lines and two TC-R235i lines red at each size
// CONTROL-RECORD: 89c4ccf6 2026-11-19 total=93 red=6 scope=trial:feb9f9a9dab0 how=batch 13 pair break engine-unasked: an effect runs coachEngine on every position where it is the player's move - the TC-R235e precondition, the hint line and the after-takeback line red at each size ('Engine: +1.0. Best move: e5.' with nothing asked)
// CONTROL-RECORD: 89c4ccf6 2026-11-19 total=93 red=2 scope=trial:f3d19b8e5d4d how=batch 13 control note-sheet-in-flow (gates/pairs/breaks/coach-note-sheet-in-flow.diff, not in the pair): the note sheet's backdrop is laid out in the page instead of fixed - TC-R235c 'the board has not moved under the note sheet' red at both sizes (192 wide where it was 375 and 298)
// THE TREE WITH THE SUBJECT REMOVED (a9bdace0's own app.js dd8b009fc3f8, before coach mode): 2 pass, 8 fail and the harness throws at the first
// missing control (the note text box) - red, but for a missing control and not for a wrong one, which is why the four one-change breaks above
// are the controls and this is only the record that the set does not pass with its subject gone.
const L=require('../lib');
const P=require('../drive/play');
const R=require('../drive/review');
const near=(a,b)=>!!a&&!!b&&Math.abs(a.x-b.x)<=0.5&&Math.abs(a.y-b.y)<=0.5&&Math.abs(a.w-b.w)<=0.5;
const br=(r)=>r?(Math.round(r.w*10)/10+' at '+Math.round(r.x*10)/10+','+Math.round(r.y*10)/10):'none';
const has=(b,sel)=>b.page.evaluate((s)=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect();return r.width>1&&r.height>1;},sel);
const count=(b,sel)=>b.page.evaluate((s)=>document.querySelectorAll(s).length,sel);
const tap=async(b,sel,wait)=>{const ok=await b.page.evaluate((s)=>{const e=document.querySelector(s);if(!e||e.disabled)return false;e.scrollIntoView({block:'center',inline:'center'});return true;},sel);
  if(!ok)return false;await b.settle(120);const box=await b.page.locator(sel).first().boundingBox();if(!box)return false;await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.settle(wait==null?450:wait);return true;};
const hintSquares=(b)=>b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0];if(!g)return null;
  const out=[];[...g.children].slice(0,64).forEach((sq,i)=>{if([...sq.querySelectorAll('div')].some(d=>/rgba\(255, ?200, ?30/.test(d.style.background||'')))out.push('abcdefgh'[i%8]+(8-Math.floor(i/8)));});return out.sort();});
const slot=async(b)=>((await P.status(b)).txt||'');
const fit=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-opening"]');if(!e)return null;const r=e.getBoundingClientRect();return {sw:e.scrollWidth,cw:e.clientWidth,sh:e.scrollHeight,ch:e.clientHeight,l:r.left,r:r.right,vw:innerWidth};});
const saved=(b)=>b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_coachgames')||'[]');}catch(e){return null;}});
const more=async(b)=>{await P.tapBtn(b,/^More$/,450);};
const coachRows=(b)=>b.page.evaluate(()=>({sheet:!!document.querySelector('[data-ct="more-sheet"]'),note:!!document.querySelector('[data-ct="more-coach-note"]'),eng:!!document.querySelector('[data-ct="more-coach-engine"]'),tb:!!document.querySelector('[data-ct="more-takeback"]')}));
const NOTE1='Good first move, it takes the centre',NOTE3='Develop the knight before the bishop';
const ENG=/^Engine: (?:[+-]\d+\.\d|-?M\d+)\. Best move: (?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?\.$/;
const GEOS=(process.env.CT_G170_GEO?[process.env.CT_G170_GEO]:['kunal761','se']);
L.run(async()=>{
  for(const geo of GEOS){
    const T=(id)=>geo+' TC-R235'+id+' ';
    const b=await L.launch({geo,name:'coach170-'+geo,store:{ct_pool:'3'}});await b.open();
    // ── a. the New Game sheet: Coach mode is chosen with the level, on the Computer's sheet ─────────────────────────────────────────
    await P.states['setup'](b);await b.settle(300);
    const sw0=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-coach"]');if(!e)return null;const r=e.getBoundingClientRect();return {on:e.getAttribute('aria-checked'),txt:(e.innerText||'').replace(/\s+/g,' ').trim(),h:Math.round(r.height*10)/10,w:Math.round(r.width*10)/10,l:r.left,r:r.right,vw:innerWidth,fit:e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1&&[...e.children].every(c=>{const q=c.getBoundingClientRect();return q.left>=r.left-0.5&&q.right<=r.right+0.5;})};});
    L.say(!!sw0&&sw0.on==='false'&&/Coach mode/.test(sw0.txt)&&/Off$/.test(sw0.txt),T('a')+'the Computer sheet offers Coach mode, off until it is chosen ("'+(sw0&&sw0.txt)+'")',sw0);
    L.say(!!sw0&&sw0.h>=44&&sw0.w>=44&&sw0.l>=0&&sw0.r<=sw0.vw+0.5&&sw0.fit,T('a')+'and the button is a full tap target inside the screen, its two lines whole ('+(sw0&&sw0.w)+'x'+(sw0&&sw0.h)+')',sw0);
    await tap(b,'[data-ct="setup-coach"]',300);
    const sw1=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-coach"]');return e?{on:e.getAttribute('aria-checked'),txt:(e.innerText||'').replace(/\s+/g,' ').trim()}:null;});
    L.say(!!sw1&&sw1.on==='true'&&/On$/.test(sw1.txt),T('a')+'one tap switches it on ("'+(sw1&&sw1.txt)+'")',sw1);
    await P.pickBot(b,'Pip');await P.tapStart(b,900);await P.ensureMovesShown(b);
    // ── b. the game is a coach game: four plies, then the More sheet carries the two coach rows ─────────────────────────────────────
    await b.move('e2','e4',0);await P.waitPlies(b,2);await b.settle(500);await b.move('g1','f3',0);await P.waitPlies(b,4);await b.settle(700);
    const B0=await b.board();
    const pre=await b.page.evaluate(()=>({sheet:!!document.querySelector('[data-ct="coach-note-sheet"]'),marks:document.querySelectorAll('[data-coach-ply][data-note="1"]').length,plies:document.querySelectorAll('[data-coach-ply]').length}));
    L.say(!!B0&&B0.w>200&&!pre.sheet&&pre.marks===0&&pre.plies===4,T('b')+'PRECONDITION four plies are on the board, the board is measured ('+br(B0)+'), and no note or note sheet exists yet',{B0,pre});
    await more(b);const rows=await coachRows(b);
    L.say(rows.sheet&&rows.note&&rows.eng&&rows.tb,T('b')+'the More sheet of a coach game carries Note on a move and Engine\'s view, beside Takeback',rows);
    // ── c. notes: on any move already played ────────────────────────────────────────────────────────────────────────────────────────
    await tap(b,'[data-ct="more-coach-note"]',500);
    const sh=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="coach-note-sheet"]');if(!s)return null;const r=s.getBoundingClientRect();const t=document.querySelector('[data-ct="coach-note-text"]');const tr=t?t.getBoundingClientRect():null;
      return {chips:s.querySelectorAll('[data-ply]').length,on:(s.querySelector('[data-on="1"]')||{getAttribute(){return null;}}).getAttribute('data-ply'),l:r.left,r:r.right,b:r.bottom,vw:innerWidth,vh:innerHeight,box:tr?{t:tr.top,b:tr.bottom,h:tr.height}:null};});
    L.say(!!sh&&sh.chips===4&&sh.on==='4'&&!!sh.box,T('c')+'Note on a move opens a sheet with every move played (4) and a text box, on the last move',sh);
    L.say(!!sh&&sh.l>=-0.5&&sh.r<=sh.vw+0.5&&sh.b<=sh.vh*0.6&&!!sh.box&&sh.box.b<=sh.vh*0.5,T('c')+'the sheet hangs from the top of the screen, its text box in the top half where a keyboard cannot cover it (box bottom '+(sh&&sh.box&&Math.round(sh.box.b))+' of '+(sh&&sh.vh)+')',sh);
    const Bc1=await b.board();L.say(near(B0,Bc1),T('c')+'the board has not moved under the note sheet ('+br(Bc1)+' against '+br(B0)+')',{B0,Bc1});
    await tap(b,'[data-ct="coach-note-sheet"] [data-ply="1"]',300);await b.page.locator('[data-ct="coach-note-text"]').fill(NOTE1);await b.settle(150);await tap(b,'[data-ct="coach-note-save"]',450);
    await more(b);await tap(b,'[data-ct="more-coach-note"]',500);await tap(b,'[data-ct="coach-note-sheet"] [data-ply="3"]',300);await b.page.locator('[data-ct="coach-note-text"]').fill(NOTE3);await b.settle(150);await tap(b,'[data-ct="coach-note-save"]',450);
    const mk=await b.page.evaluate(()=>({sheet:!!document.querySelector('[data-ct="coach-note-sheet"]'),marked:[...document.querySelectorAll('[data-coach-ply][data-note="1"]')].map(e=>e.getAttribute('data-coach-ply')+':'+(e.innerText||'').trim()+':'+getComputedStyle(e).textDecorationLine)}));
    L.say(!mk.sheet&&mk.marked.join(' ')==='1:e4:underline 3:Nf3:underline',T('c')+'a note is saved on move 1 and on move 3, the sheet closes, and exactly those two moves are underlined in the list ('+mk.marked.join(' ')+')',mk);
    const Bc2=await b.board();L.say(near(B0,Bc2),T('c')+'the board has not moved after the notes were saved ('+br(Bc2)+')',{B0,Bc2});
    await tap(b,'[data-coach-ply="3"]',500);
    const back=await b.page.evaluate(()=>{const t=document.querySelector('[data-ct="coach-note-text"]');const s=document.querySelector('[data-ct="coach-note-sheet"]');return {v:t?t.value:null,on:s&&s.querySelector('[data-on="1"]')?s.querySelector('[data-on="1"]').getAttribute('data-ply'):null,del:!!document.querySelector('[data-ct="coach-note-delete"]')};});
    L.say(back.v===NOTE3&&back.on==='3'&&back.del,T('c')+'tapping the move in the list opens ITS note for editing, with the words that were saved ("'+back.v+'")',back);
    await tap(b,'[data-ct="coach-note-cancel"]',400);
    // ── e (first half). the engine's view is NOT there until it is asked for ────────────────────────────────────────────────────────
    const s0=await slot(b);const h0=await hintSquares(b);
    L.say(!/^Engine/.test(s0)&&Array.isArray(h0)&&h0.length===0,T('e')+'PRECONDITION before anything is asked the status line carries no engine text and no square is lit ("'+s0+'")',{s0,h0});
    // ── d. a hint ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    await P.tapBtn(b,/^Hint$/,200);let hs=null;for(let i=0;i<24;i++){await b.settle(250);hs=await hintSquares(b);if(hs&&hs.length)break;}
    L.say(!!hs&&hs.length===2,T('d')+'Hint lights a move ('+(hs&&hs.join('-'))+')',hs);
    const Bd=await b.board();L.say(near(B0,Bd),T('d')+'the board has not moved for the hint ('+br(Bd)+')',{B0,Bd});
    const s1=await slot(b);L.say(!/^Engine/.test(s1),T('e')+'and a hint does not bring the engine\'s view with it ("'+s1+'")',{s1});
    // ── e. the engine's view, on request ────────────────────────────────────────────────────────────────────────────────────────────
    await more(b);await tap(b,'[data-ct="more-coach-engine"]',300);let et='';for(let i=0;i<60;i++){await b.settle(250);et=await slot(b);if(ENG.test(et))break;}
    L.say(ENG.test(et),T('e')+'Engine\'s view shows the evaluation and the best move, when it is asked for ("'+et+'")',{et});
    const f=await fit(b);L.say(!!f&&f.sw<=f.cw+1&&f.sh<=f.ch+1&&f.l>=0&&f.r<=f.vw+0.5,T('e')+'the whole line is painted in the status slot - not cut ('+(f&&f.sw)+'x'+(f&&f.sh)+' in '+(f&&f.cw)+'x'+(f&&f.ch)+')',f);
    const Be=await b.board();L.say(near(B0,Be),T('e')+'the board has not moved for the engine\'s view ('+br(Be)+')',{B0,Be});
    const mo=await b.page.evaluate(()=>!!document.querySelector('[data-ct="more-sheet"]'));L.say(!mo,T('e')+'and the More sheet has closed, so the view is over the game and not over a sheet',{mo});
    // ── f. a takeback ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    await more(b);await tap(b,'[data-ct="more-takeback"]',700);
    const tk=await b.page.evaluate(()=>({plies:document.querySelectorAll('[data-coach-ply]').length,marked:[...document.querySelectorAll('[data-coach-ply][data-note="1"]')].map(e=>e.getAttribute('data-coach-ply')).join(',')}));
    L.say(tk.plies===2,T('f')+'Takeback gives back the last move and its reply (2 plies left of 4)',tk);
    L.say(tk.marked==='1',T('f')+'the note on the move that was taken back went with it; the note on move 1 stays (marked: '+tk.marked+')',tk);
    const Bf=await b.board();L.say(near(B0,Bf),T('f')+'the board has not moved for the takeback ('+br(Bf)+')',{B0,Bf});
    const s2=await slot(b);L.say(!/^Engine/.test(s2),T('e')+'the engine\'s view went with the position it was of ("'+s2+'")',{s2});
    await b.move('d2','d4',0);await P.waitPlies(b,4);await b.settle(800);
    // ── g. the game is saved with its notes and what was asked for ──────────────────────────────────────────────────────────────────
    const sv=await saved(b);const row=sv&&sv[0];const tag=row?((/\[CTCoach "([^"]*)"\]/.exec(row.pgn)||[])[1]||''):'';
    L.say(!!sv&&sv.length===1&&!!row&&row.n===4&&row.notes===1,T('g')+'PRECONDITION the phone holds one saved coach game, four plies and one note',sv&&sv.map(x=>({n:x.n,notes:x.notes,res:x.res})));
    L.say(!!row&&row.pgn.indexOf('1. e4 {'+NOTE1+'}')>=0&&row.pgn.indexOf(NOTE3)<0,T('g')+'the saved game carries the note on its move, and not the note of the move that was taken back',row&&row.pgn);
    L.say(/\bh3\b/.test(tag)&&/\be3\b/.test(tag)&&/\bt3\b/.test(tag),T('g')+'and what was asked for before move 3 - the hint, the engine\'s view and the takeback ("'+tag+'")',{tag});
    // ── h. it opens in Review with its notes ────────────────────────────────────────────────────────────────────────────────────────
    await more(b);await P.tapBtn(b,/^Resign$/,600);await P.tapBtn(b,/^Tap again to resign$/,1100);
    let rvOk=true;try{await P.tapBtn(b,/^Review$/,500);await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(800);}catch(e){rvOk=false;}
    const sm=await b.text('[data-ct="rev-coach"]');
    L.say(rvOk&&sm==='Coach game · 1 note',T('h')+'Review opens the game and its summary says it is a coach game with one note ("'+sm+'")',{rvOk,sm});
    let why1=null,why2=null,why3=null,Br1=null,Br2=null,Br3=null,sheetTxt=null;
    try{await R.startReview(b);await R.goPly(b,1);why1=await b.text('[data-ct="rev-why-txt"]');Br1=await b.board();
      await tap(b,'[data-ct="rev-why-txt"]',450);sheetTxt=await b.text('[data-ct="rev-why-sheet"]');if(sheetTxt!=null)await tap(b,'[data-ct="rev-why-sheet"]',350);
      await R.goPly(b,2);why2=await b.text('[data-ct="rev-why-txt"]');Br2=await b.board();
      await R.goPly(b,3);why3=await b.text('[data-ct="rev-why-txt"]');Br3=await b.board();}catch(e){why1=why1||('ERR '+e.message);}
    L.say(!!why1&&why1.indexOf('📝 '+NOTE1)===0,T('h')+'at move 1 the line under the board leads with its note ("'+why1+'")',{why1});
    L.say(!!sheetTxt&&sheetTxt.indexOf(NOTE1)>=0,T('h')+'and a tap opens the whole of it ("'+String(sheetTxt||'').slice(0,90)+'")',{sheetTxt});
    L.say(why2!=null&&why2.indexOf('📝')<0&&why2.indexOf(NOTE1)<0,T('h')+'move 2 has no note and shows none ("'+why2+'")',{why2});
    L.say(!!why3&&/^Before this move a hint was asked for, a move was taken back and the engine's view was opened\./.test(why3),T('h')+'move 3 says what was asked for before it ("'+why3+'")',{why3});
    L.say(near(Br1,Br2)&&near(Br1,Br3),T('h')+'the Review board is in one place with a note, without one and with the requests ('+br(Br1)+', '+br(Br2)+', '+br(Br3)+')',{Br1,Br2,Br3});
    // ── i. and again from More > Saved coach games     ──────────────────────────────────────────────────────────────────────────────
    await P.states['setup'](b);await P.pickBot(b,'Pip');await P.tapStart(b,900);await b.settle(400);await more(b);
    const sb=await b.text('[data-ct="more-coach-saved"]');
    L.say(sb==='Saved coach games (1)',T('i')+'in a new game against the computer the More sheet says one coach game is saved ("'+sb+'")',{sb});
    await tap(b,'[data-ct="more-coach-saved"]',500);const lr=await b.text('[data-ct="coach-saved-row"]');
    L.say(!!lr&&/You vs Pip/.test(lr)&&/0-1/.test(lr)&&/1 note\b/.test(lr),T('i')+'the list names the game, its result and its note count ("'+lr+'")',{lr});
    let i1=null,ok2=true;try{await tap(b,'[data-ct="coach-saved-row"]',500);await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:180000});await b.settle(700);await R.startReview(b);await R.goPly(b,1);i1=await b.text('[data-ct="rev-why-txt"]');}catch(e){ok2=false;i1=i1||('ERR '+e.message);}
    L.say(ok2&&!!i1&&i1.indexOf('📝 '+NOTE1)===0,T('i')+'a tap opens that game in Review, and move 1 carries its note there too ("'+i1+'")',{ok2,i1});
    const pub=await b.page.evaluate(()=>{const r=window.__ctReview;return r?{own:/\[CTCoach "/.test(r.pgn||'')}:null;});
    // the PGN a player takes away is what Copy PGN (the Review's own sheet) hands the clipboard; the copy is caught at the clipboard call
    let box=null;try{await b.page.evaluate(()=>{window.__clip=null;try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:(t)=>{window.__clip=t;return Promise.resolve();}}});}catch(e){}
        document.execCommand=function(c){if(c==='copy'&&window.__clip==null){const a=document.activeElement;window.__clip=a?a.value:null;}return true;};});   // headless Chromium refuses the real clipboard
      await b.tapCt('rev-more',450);await b.tapText(/^Copy PGN$/);await b.settle(400);box=await b.page.evaluate(()=>window.__clip);await R.closeSheet(b);}catch(e){box=box||null;}
    L.say(!!pub&&pub.own&&box!=null&&box.indexOf('{'+NOTE1+'}')>=0&&box.indexOf('[White "You"]')>=0&&!/CTCoach/.test(box),T('i')+'the PGN a player can take away (Copy PGN) keeps the note as a comment and drops the app\'s private tag',{pub,box:box&&box.slice(0,260)});
    // ── j. THE GUARD: only the app's own game against the computer ──────────────────────────────────────────────────────────────────
    await b.home();await b.tile('Play');await b.settle(600);
    if(!(await has(b,'[data-ct="setup-sheet"]'))){try{await P.tapBtn(b,/^More$/,450);await P.tapBtn(b,/^New game$/,600);}catch(e){}}
    await P.tapBtn(b,/^Computer$/,300).catch(()=>{});await P.botBack(b);await b.settle(250);
    const swOn=()=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="setup-coach"]');return e?e.getAttribute('aria-checked'):null;});
    if((await swOn())==='false')await tap(b,'[data-ct="setup-coach"]',300);   // a reload on the way Home drops the pending choice; it is put back so the guard is measured with it ON
    const stillOn=await swOn();
    L.say(stillOn==='true',T('j')+'PRECONDITION Coach mode is switched on, and the Computer sheet shows it',{stillOn});
    await P.tapBtn(b,/^Pass & Play$/,400);const jp=await count(b,'[data-ct="setup-coach"]');
    L.say(jp===0,T('j')+'the Pass & Play sheet has no Coach row ('+jp+')',{jp});
    await P.tapBtn(b,/^Online$/,500);const jo=await count(b,'[data-ct="setup-coach"]');
    L.say(jo===0,T('j')+'the Online sheet has no Coach row ('+jo+')',{jo});
    await P.tapBtn(b,/^Continue/,1200).catch(()=>{});const jo2=await count(b,'[data-ct^="setup-coach"],[data-ct^="more-coach"],[data-ct^="coach-"],[data-coach-ply]');
    L.say(jo2===0,T('j')+'nor does the Online screen behind it carry any coach control ('+jo2+')',{jo2});
    await b.open();
    // a Pass & Play game with Coach mode still wanted: the switch is tapped on the Computer sheet first, then Pass & Play is chosen
    await P.states['setup'](b);await b.settle(250);if((await swOn())==='false')await tap(b,'[data-ct="setup-coach"]',300);
    const on2=await swOn();
    await P.tapBtn(b,/^Pass & Play$/,400);try{await P.selectTime(b,null);}catch(e){}await P.tapStart(b,900);await P.ensureMovesShown(b);
    await b.move('e2','e4');await b.move('e7','e5');await b.move('g1','f3');await b.settle(500);
    await more(b);const pr=await coachRows(b);const pm=await count(b,'[data-coach-ply]');await P.closeSheet(b);
    const hb=await b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>(e.getAttribute('title')||'')==='Hint'&&e.getBoundingClientRect().height>0);return x?!!x.disabled:null;});
    L.say(on2==='true'&&pr.sheet&&!pr.note&&!pr.eng&&!pr.tb&&pm===0,T('j')+'a game between two people, started with Coach mode still switched on, has no Note row, no Engine\'s view, no Takeback and no move that opens a note',{on2,pr,pm});
    const sp=await slot(b);L.say(hb===true&&!/^Engine/.test(sp),T('j')+'and its Hint is dead and its status line carries no engine text ("'+sp+'")',{hb,sp});
    const svp=await saved(b);L.say(!!svp&&svp.length===1&&svp[0].n===4,T('j')+'and it was not saved as a coach game (the store still holds the one game of four plies)',svp&&svp.map(x=>({n:x.n,w:x.w,b:x.b})));
    // a computer game with Coach mode switched off
    await P.states['setup'](b);await b.settle(250);
    const on3=await swOn();
    if(on3==='true')await tap(b,'[data-ct="setup-coach"]',300);
    await P.pickBot(b,'Pip');await P.tapStart(b,900);await P.ensureMovesShown(b);await b.move('e2','e4',0);await P.waitPlies(b,2);await b.settle(600);
    await more(b);const cr=await coachRows(b);const cm=await count(b,'[data-coach-ply]');await P.closeSheet(b);
    L.say(cr.sheet&&cr.tb&&!cr.note&&!cr.eng&&cm===0,T('j')+'a computer game started with Coach mode off has Takeback as before and neither coach row',{cr,cm});
    const svc=await saved(b);L.say(!!svc&&svc.length===1,T('j')+'and is not saved as a coach game ('+(svc&&svc.length)+' in the store)',{n:svc&&svc.length});
    L.say(b.errs.length===0,T('')+'zero app errors',b.errs.slice(0,3));await b.close();
  }
},'170-coach-mode');
