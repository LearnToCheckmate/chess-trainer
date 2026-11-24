// gates/regress/176-review-game-in-progress.js
// batch 13, jobs/review-a-chess-com-game-while-it-is-being-played-kept-private-2026-11-16 (Kunal, 16 Nov 2026): IN REVIEW, BEHIND A
// DEVELOPER SWITCH THAT IS OFF IN THE PUBLIC APP, A CHESS.COM GAME STILL BEING PLAYED OPENS AS A REVIEW THAT GROWS AS ITS MOVES ARRIVE.
// US-R173 / TC-R247a..h, and TC-R261 (his own games reviewed live, his answer of 19 Nov 2026). Graded on a trial bundle at 375x761 with his insets (kunal761) and at 320x568 (se), after the game is opened.
//
// WHAT IT DRIVES. Three launches per geometry, every chess.com request answered by this gate's own route (nothing leaves the
// container; the in-progress answers are gates/fixtures/chesscom-current-daily-games.json, built from the API's documented shape):
//   1 SWITCH OFF  the developer tools on (the harness default) and the switch not set - how the app ships for him and for everyone
//   2 PLAYER      the switch's key written by hand ('1') in a browser WITHOUT the developer tools - a player who found the key
//   3 SWITCH ON   the developer tools on and the switch on
// The followed accounts are gateme (his: the name in the Chess.com box) and gatefriend (marked "not yours"). In progress:
//   A gatefriend vs Stranger99  (nobody of his plays)   6 plies, then 8, then 10 as the gate moves the fixture on
//   B gatefriend vs GateMe      (HIS account plays; it comes in on the FRIEND's list too)
//   C GateMe vs OtherPerson     (his)
// a/b: with the switch off, and for a player with the key, nothing of it shows and no request goes to the in-progress list.
// c: with it on the three games are listed, from one request per followed account. d: HIS OWN GAMES ARE REVIEWED LIVE (his Desk answer
// to run-question q24 call (1), 11:22pm EST Thu 19 Nov 2026, "Review my own games live as well"; until then they waited for the end):
// B and C read like any game in progress, with no wait line, and a tap on each opens its review, the summary naming its players and
// reading In progress with its moves so far, and its positions reach a Stockfish worker; the gate goes back to the list after each,
// and nothing of either is kept (read in e against the list as first shown). e: A opens as a review and
// nothing of it is stored. f: THE REVIEW GROWS - after the fixture gains a move the open summary reads 8 moves with no tap, and
// (kunal761) on the move screen at the last move it follows to 10 with the board where it was. g: POLITE - no two requests about one
// account within 30 s, none to /games/to-move or to a chess.com page, and (kunal761) none at all for 50 s once the review is closed.
// h: the list's layout (inside the screen, 44px rows, text 13.5px or more) and zero app errors.
// i (batch 14, the job's listed limit "the games box squeezed to about 88px"): with the switch on, the games box starts where it does in launch 1
// (switch off), is no scroller of its own, and the games in progress are its top, above the finished games (re-pinned at #553 for card 69; it
// read the box's scroller height and 'the page does not scroll' until then).
// j (batch 14, the job's listed limit "the summary line wraps at 375"): the open review's "In progress ... so far" and "checked h:mm AM" each
// sit whole on one line, uncut, at 6 moves and at 8, and their block keeps its height. At 375 the old one-line wording ran 352px into 351
// at 12:29 AM, so whether IT wrapped there depended on the clock (a one-digit hour fits); its pairs breaks are graded at 320x568, where it always does.
// NOT COVERED: a real chess.com response (the network is closed here); the "This game has ended" line; the review of a game that
// ends while open; a Chess960 Daily game (left out of the list by its rules field); the Menu switch row's own tap (gate 47 owns the
// Menu; this gate sets the key the row writes); his phone.
//
// A REQUEST IS COUNTED BY THE ROUTE, NOT BY THE APP, and the own-game check reads the messages posted to the Stockfish workers
// (a wrapper installed before the page's scripts), so neither reads a hook this build adds. The list rows are found by the
// players' names in the page's text first; the data-ct hooks are used for geometry only.
// CONTROL-RECORD: ab9d2eea 2026-11-20 total=9 red=1 scope=trial:5d8f7a318212 how=batch 13, THE SUBJECT REMOVED: the tree before the change (3fb41a07's chess.jsx built as a trial), CT_G176_GEO=kunal761 - with the switch's key set there is no list, so TC-R247c is red and nothing after it is read; the six lines of a and b pass, as they must on a tree with no such feature
// CONTROL-RECORD: ab9d2eea 2026-11-20 total=42 red=4 scope=trial:8217d029b597 how=batch 13, pairs break list-shows-with-the-switch-off (liveOn no longer asks for the switch), both geometries, run by the grading machine: both TC-R247a lines red at each - the games are listed with the switch never turned on and the in-progress list was asked for
// CONTROL-RECORD: ab9d2eea 2026-11-20 total=40 red=2 scope=trial:bb504d512e0a how=batch 13, pairs break review-does-not-grow (the open review asks and never takes the new move in), both geometries, run by the grading machine: the TC-R247f summary line red at each after its 80 s wait - still 6 moves; the move-screen growth and the silence after closing are then not read
// CONTROL-RECORD: ab9d2eea 2026-11-20 total=31 red=8 scope=trial:9a2fc9b0f25b how=batch 13, BEFORE HIS 19 NOV ANSWER (the wait was the rule then and that break is now the fix; kept as history), pairs break own-game-reviewed-live (LIVE_OWN_GAMES_WAIT false), both geometries, run by the grading machine: at each the three TC-R247d lines red - no row says its review waits and a tap on B opens its review - and TC-R247e red behind them
// CONTROL-RECORD: ab9d2eea 2026-11-20 total=23 red=2 scope=trial:3767dee77109 how=batch 13, liveOn reads the switch's key alone and not the developer tools, CT_G176_GEO=kunal761: both TC-R247b lines red - a player who set the key by hand gets the list and the request
// CONTROL-RECORD: ab9d2eea 2026-11-20 total=23 red=1 scope=trial:62cc0f13e312 how=batch 13, liveAsk spaces its requests by 4 s instead of LIVE_POLL_MS, CT_G176_GEO=kunal761: the TC-R247g spacing line red (gaps 16, 5, 5 s)
// CONTROL-RECORD: ab9d2eea 2026-11-20 total=21 red=2 scope=trial:579ac2646155 how=batch 13, the list is asked for on a timer whether or not the Review screen or a review is open, CT_G176_GEO=kunal761: the TC-R247g line for the 50 s after closing red (6 requests before, 8 after), and TC-R247f red because the timer spends the open game's turn to ask
// CONTROL-RECORD: 9b557e2b 2026-11-21 total=46 red=6 scope=trial:1e27a8d5bea5 how=batch 13, pairs break own-game-waits-again (LIVE_OWN_GAMES_WAIT true), both geometries, run by the grading machine: at each the three TC-R247d TC-R261 lines red - the rows say the review waits, and a tap on B and on C opens no review
// CONTROL-RECORD: 9b557e2b 2026-11-21 total=22 red=1 scope=trial:1671a51ee20b how=batch 13, liveOpen gives the live import a stored key (cc:0:<white>:<black>), CT_G176_GEO=se: the TC-R247e TC-R261 nothing-kept line red - the review tally gained cc:0:gatefriend:gateme, cc:0:gateme:otherperson and cc:0:gatefriend:stranger99; B's key names neither Stranger99 nor OtherPerson, so only the new key check sees his own game kept
// (not control records) batch 13, 2026-11-21: the whole gate with 9b557e2b on the #552 bundle 73249bd45e30 reads 46/0 at both geometries. Before 9b557e2b the same bundle read 44/2: with ebffce55's baseline taken at the list as first shown, ct_gamestats compared as a string went red at each geometry because the background pass estimates the held game gatefriend:oldfoe after it - the gate's own fault, fixed by reading the tally's keys against the two held games.
// A mutant that stayed GREEN, kept so it is not mistaken for a control: the open review's timer never cleared when the review closes
// (trial bf1652419fe6, 23 lines, 0 red at kunal761). The tick also checks that a review of a game in progress is open, so nothing is asked;
// two guards overlap there, and the line for the 50 s after closing is shown able to fail by the timer control above instead.
const fs=require('fs'),path=require('path');
const L=require('../lib');const R=require('../drive/review');
const FX=JSON.parse(fs.readFileSync(path.join(__dirname,'..','fixtures','chesscom-current-daily-games.json'),'utf8'));
const T=(y,mo,d,h)=>Math.floor(Date.UTC(y,mo-1,d,h||12,0,0)/1000);
const donePgn=(w,b)=>['[Event "Live Chess"]','[Site "Chess.com"]','[Date "2026.10.12"]','[Round "-"]','[White "'+w+'"]','[Black "'+b+'"]','[Result "1-0"]','[TimeControl "600"]','[Termination "'+w+' won by resignation"]','','1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6 1-0'].join('\n');
const doneGame=(u,opp,id)=>({url:'https://www.chess.com/game/live/'+id,pgn:donePgn(u,opp),time_control:'600',end_time:T(2026,10,12),rated:true,time_class:'rapid',rules:'chess',white:{username:u,result:'win',rating:1400},black:{username:opp,result:'resigned',rating:1390}});
// the finished game each account already holds (the stored row's shape), which is also what its October archive answers
const heldRow=(u,opp)=>({src:'cc',acct:u,white:u,black:opp,wr:'win',tc:'rapid',date:T(2026,10,12)*1000,pgn:donePgn(u,opp)});
const STORE={ct_ccuser:'gateme',ct_liuser:'',ct_accts:['cc:gateme','cc:gatefriend'],ct_acctmine:{'cc:gatefriend':false},ct_acctasked:{'cc:gateme':1,'cc:gatefriend':1},ct_acctgames:{'cc:gateme':[heldRow('gateme','oldrival')],'cc:gatefriend':[heldRow('gatefriend','oldfoe')]},ct_pool:'3',ct_bril_reset_v1:'1'};
// the rank-4 strings of every position of B (1.d4 d5 2.c4 e6) and C (1.c4 e5) after its first move; A and the finished games open 1.e4
const OWN_RANK4=['3P4','2PP4','2P5'];
// records every position posted to a Stockfish worker: window.__ctPos is the list of FEN board fields
function recordPos(){try{const RW=window.Worker;if(!RW||window.__ctPos)return;window.__ctPos=[];
  const W=function(url,o){const w=new RW(url,o);if(!/stockfish/i.test(String(url)))return w;const pm=w.postMessage.bind(w);w.postMessage=function(m){try{const x=/^position fen (\S+)/.exec(String(m));if(x)window.__ctPos.push(x[1]);}catch(e){}return pm.apply(null,arguments);};return w;};
  W.prototype=RW.prototype;window.Worker=W;}catch(e){}}
const stub=async(b,S)=>{await b.ctx.route(/chess\.com/,async(route)=>{const u=route.request().url();S.hits.push({u,t:Date.now()});
  const j=(o,st)=>route.fulfill({status:st||200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(o)});
  let m=u.match(/api\.chess\.com\/pub\/player\/([^/]+)\/games\/archives$/);if(m)return j({archives:['https://api.chess.com/pub/player/'+m[1]+'/games/2026/10']});
  m=u.match(/api\.chess\.com\/pub\/player\/([^/]+)\/games\/2026\/10$/);if(m)return j({games:[doneGame(m[1],m[1]==='gateme'?'oldrival':'oldfoe',m[1]==='gateme'?7001:7002)]});
  m=u.match(/api\.chess\.com\/pub\/player\/([^/]+)\/games$/);if(m){const a=FX.accounts[m[1]];if(!a)return j({games:[]});return j(a.stages[String(S.plies)]||a.stages['6']);}
  return j({},404);});};
const inProg=(S,u)=>S.hits.filter(h=>/\/pub\/player\/[^/]+\/games$/.test(h.u)&&(!u||h.u.indexOf('/player/'+u+'/')>=0));
const toMove=(S)=>S.hits.filter(h=>/\/games\/to-move/.test(h.u)).length;
const pages=(S)=>S.hits.filter(h=>!/^https:\/\/api\.chess\.com\/pub\//.test(h.u)).length;
const read=(b)=>b.page.evaluate(()=>{const q=e=>{const x=e.getBoundingClientRect();return {l:x.left,t:x.top,r:x.right,b:x.bottom,w:x.width,h:x.height};};const body=document.body.innerText||'';
  // a game in progress is found by its players' names in a button's text, whatever hook it carries
  const btns=[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width>0);
  const rowOf=(re)=>{const e=btns.find(x=>re.test((x.innerText||'').replace(/\s+/g,' ')));if(!e)return null;const texts=[...e.querySelectorAll('span')].map(s=>({t:s.textContent.trim(),fs:parseFloat(getComputedStyle(s).fontSize),cut:s.scrollWidth>s.clientWidth+1,ell:getComputedStyle(s).textOverflow==='ellipsis'}));
    return {text:(e.innerText||'').replace(/\s+/g,' ').trim(),rect:q(e),texts,off:e.getAttribute('aria-disabled')==='true'};};
  const sec=document.querySelector('[data-ct="live-section"]');const rv=window.__ctReview;const sum=document.querySelector('[data-ct="rev-summary"]');
  let ls={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls[k]=localStorage.getItem(k)||'';}}catch(e){}
  return {vw:innerWidth,vh:innerHeight,body:body.replace(/\s+/g,' '),said:/Games in progress|developer only|review opens when it ends/i.test(body),section:sec?q(sec):null,
    A:rowOf(/gatefriend vs Stranger99/),B:rowOf(/gatefriend vs GateMe/),C:rowOf(/GateMe vs OtherPerson/),
    games:document.querySelectorAll('[data-ct="game-row"]').length,summary:!!sum&&sum.getBoundingClientRect().width>0,sumText:sum?(sum.innerText||'').replace(/\s+/g,' ').slice(0,260):'',analyzing:/Analyzing your game/.test(body),
    plies:rv&&rv.plies?rv.plies.length:null,moveLine:(()=>{const e=[...document.querySelectorAll('[data-ct="rev-move-line"]')].pop();return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;})(),rvWhite:rv&&rv.headers?rv.headers.White:null,pos:(window.__ctPos||[]).slice(),
    starInStore:Object.keys(ls).filter(k=>/Stranger99|stranger99|OtherPerson|otherperson|Result \\?"\*/.test(ls[k])&&k!=='ct_country'),gs:ls.ct_gamestats||'',mm:ls.ct_mymistakes||'',mb:ls.ct_mybrilliancies||''};});
const rank4=(f)=>String(f).split('/')[4];
// the review tally (ct_gamestats) is keyed by stored game (src:date:white:black); the background pass estimates the two HELD finished
// games while the gate runs, so the tally may gain their keys - and must never hold any other, a game in progress having no key
const gsKeys=(t)=>{try{return Object.keys(JSON.parse(t||'{}')||{});}catch(e){return ['<unreadable>'];}};
const HELD_KEY=/^cc:\d+:(gateme:oldrival|gatefriend:oldfoe)$/i;
const until=async(b,fn,ms)=>{const t0=Date.now();for(;;){const r=await read(b);if(fn(r))return {ok:true,r,ms:Date.now()-t0};if(Date.now()-t0>ms)return {ok:false,r,ms:Date.now()-t0};await b.settle(1000);}};
const boardRect=(b)=>b.page.evaluate(()=>{let best=null;document.querySelectorAll('div').forEach(d=>{const g=getComputedStyle(d).gridTemplateColumns;if(g&&g.split(' ').length===8){const r=d.getBoundingClientRect();if(!best||r.width>best.w)best={l:Math.round(r.left*10)/10,t:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10};}});return best;});
const stripCount=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="strip-row"]');return s?(s.innerText||'').replace(/\s+/g,' ').trim():null;});

// batch 14 (the job's two listed limits). THE GAMES BOX: the scroller around the finished games (found from a game card, the nearest ancestor that
// scrolls, never #root) and what #root would still scroll - the Review list is a fixed page (q45), so with the switch on the box must keep
// the height it has with the switch off and the page must not scroll. Read the same way in both launches, so the switch is the only difference.
// #553 B1 RE-PIN [jobs/the-review-list-scrolls-the-whole-page-or-the-list-under-a-fixed-top-decided-on-the-desk-with-pictures-first-2026-11-22,
// his card-69 pick 'whole-page']: the games box is no scroller any more and the PAGE scrolls, so 'not squeezed' is read as: the games box
// starts where it starts with the switch off (the section does not push it down), it is no scroller of its own, and the games in progress
// are inside it, above the first finished game - they scroll with his games, as batch 14 built it. Until #553 it read the box's scroller
// height and asserted the page did not scroll.
const boxRead=(b)=>b.page.evaluate(()=>{const box=document.querySelector('[data-ct="glist-box"]');const row=document.querySelector('[data-ct="game-row"]');
  const live=[...document.querySelectorAll('button')].find(e=>/moves played/.test(e.innerText||''));
  if(!box)return {top:null,flat:null,liveIn:null};const q=box.getBoundingClientRect();
  return {top:Math.round(q.top*10)/10,flat:box.scrollHeight<=box.clientHeight+1,oy:getComputedStyle(box).overflowY,liveIn:live?(box.contains(live)&&!!row&&live.getBoundingClientRect().bottom<=row.getBoundingClientRect().top+0.5):null};});
// THE SUMMARY'S IN-PROGRESS WORDS, found by what they say (no hook): the moves ("In progress ... so far") and the time it was checked
// ("checked h:mm AM"), each read as a Range - how many lines its glyphs sit on, and whether its right edge passes its block's (cut) - and the
// height of the smallest element holding both. Base: one string, 352px into 351, so "AM" alone took a second line.
const liveLine=(b)=>b.page.evaluate(()=>{const sum=document.querySelector('[data-ct="rev-summary"]');if(!sum)return null;const tw=document.createTreeWalker(sum,NodeFilter.SHOW_TEXT);const out={};let n;
  const rd=(nd,a,z)=>{const r=document.createRange();r.setStart(nd,a);r.setEnd(nd,z);const rs=[...r.getClientRects()].filter(x=>x.width>0);let blk=nd.parentElement;while(blk&&getComputedStyle(blk).display==='inline')blk=blk.parentElement;const br=blk.getBoundingClientRect();
    return {t:nd.textContent.slice(a,z),lines:new Set(rs.map(x=>Math.round(x.top))).size,right:Math.round(Math.max(...rs.map(x=>x.right))*10)/10,edge:Math.round(br.right*10)/10,cut:rs.some(x=>x.right>br.right+0.5)};};
  while((n=tw.nextNode())){const t=n.textContent;let m=/In progress[^]*?so far/.exec(t);if(m&&!out.moves){out.moves=rd(n,m.index,m.index+m[0].length);out.mn=n;}
    m=/checked\s+\d{1,2}:\d\d(\s?[AP]M)?/i.exec(t);if(m&&!out.at){out.at=rd(n,m.index,m.index+m[0].length);out.an=n;}}
  if(out.mn&&out.an){let e=out.mn.parentElement;while(e&&!e.contains(out.an))e=e.parentElement;out.h=e?Math.round(e.getBoundingClientRect().height*10)/10:null;}delete out.mn;delete out.an;return out;});
const liveLineOk=(x)=>!!x&&!!x.moves&&!!x.at&&x.moves.lines===1&&x.at.lines===1&&!x.moves.cut&&!x.at.cut;
L.run(async()=>{
  for(const geo of (process.env.CT_G176_GEO?process.env.CT_G176_GEO.split(','):['kunal761','se'])){   // CT_G176_GEO=se runs one geometry (a rerun while fixing; never the graded run)
    const tag=geo;const full=geo==='kunal761';
    let offBox=null;
    // ── 1 and 2: the switch off, and a player with the key ──
    for(const [nm,opts,what] of [['a',{store:{...STORE}},'SWITCH OFF (developer tools on, the switch not set)'],['b',{dev:false,store:{...STORE,ct_live_review:'1'}},'A PLAYER WITH THE KEY SET (no developer tools, ct_live_review 1)']]){
      const S={hits:[],plies:6};const b=await L.launch({geo,name:'liverev-'+geo+'-'+nm,...opts});await stub(b,S);await b.open();await b.tile('Review');await b.settle(2500);
      const w=await until(b,r=>r.games>=2,15000);const r=w.r;
      if(L.say(w.ok&&S.hits.some(h=>/games\/archives$/.test(h.u)),tag+' TC-R247'+nm+' DENOMINATOR '+what+': the Review screen is up with the finished games of both accounts ('+r.games+') and chess.com was asked for their archives',{games:r.games,requests:S.hits.map(h=>h.u.replace('https://api.chess.com/pub/player/',''))})){
        await b.settle(3000);const r2=await read(b);
        L.say(!r2.section&&!r2.A&&!r2.B&&!r2.C&&!r2.said&&!/Stranger99|OtherPerson/.test(r2.body),tag+' TC-R247'+nm+' '+what+': nothing of a game in progress shows - no section, no row, no player of one named',{section:r2.section,said:r2.said});
        L.say(inProg(S).length===0&&toMove(S)===0,tag+' TC-R247'+nm+' '+what+': and no request went to chess.com\'s list of games in progress',{inProgress:inProg(S).map(h=>h.u),toMove:toMove(S)});
        if(nm==='a')offBox=await boxRead(b);   // batch 14: the games box with the switch off, for TC-R247i
      }
      await b.close();
    }
    // ── 3: the switch on ──
    const S={hits:[],plies:6};const b=await L.launch({geo,name:'liverev-'+geo+'-on',store:{...STORE,ct_live_review:'1'}});await b.ctx.addInitScript(recordPos);await stub(b,S);await b.open();await b.tile('Review');
    const w0=await until(b,r=>!!(r.A&&r.B&&r.C),20000);const r0=w0.r;await b.shot('g176-'+geo+'-list');
    if(L.say(w0.ok&&r0.games>=2,tag+' TC-R247c SWITCH ON: the three games in progress are listed above the finished games ('+r0.games+'), each by its players\' names',{A:r0.A&&r0.A.text,B:r0.B&&r0.B.text,C:r0.C&&r0.C.text,body:w0.ok?'':r0.body.slice(0,300)})){
      L.say(/Daily/.test(r0.A.text)&&/\b6 moves played\b/.test(r0.A.text)&&/White to move/.test(r0.A.text)&&!r0.A.off,tag+' TC-R247c the game nobody of his plays reads Daily, 6 moves played, White to move: "'+r0.A.text+'"',{});
      L.say(inProg(S,'gateme').length===1&&inProg(S,'gatefriend').length===1&&inProg(S).length===2,tag+' TC-R247c from one request per followed account to /pub/player/<u>/games (2), B listed once though both lists carry it',{requests:inProg(S).map(h=>h.u)});
      // layout
      const rows=[r0.A,r0.B,r0.C];const bad=[];rows.forEach((x,i)=>{if(x.rect.l<-0.5||x.rect.r>r0.vw+0.5)bad.push('row '+i+' '+x.rect.l+'..'+x.rect.r);if(x.rect.h<44-0.6)bad.push('row '+i+' height '+x.rect.h);x.texts.forEach(t=>{if(t.fs<13.5-0.01)bad.push('row '+i+' "'+t.t.slice(0,24)+'" '+t.fs+'px');if(t.cut&&!t.ell)bad.push('row '+i+' "'+t.t.slice(0,24)+'" cut with no ellipsis');});});
      L.say(rows.every(x=>x.texts.length>=2)&&bad.length===0&&!!r0.section&&r0.section.l>=-0.5&&r0.section.r<=r0.vw+0.5,tag+' TC-R247h the list is inside the '+r0.vw+'px screen, every row 44px or taller ('+rows.map(x=>x.rect.h.toFixed(0)).join(', ')+'), no text under 13.5px and none cut without an ellipsis',bad.slice(0,5));
      // ── i (batch 14): the games box is not squeezed ──
      await b.settle(1500);const onBox=await boxRead(b);
      L.say(!!offBox&&offBox.top!=null&&onBox.top!=null&&Math.abs(onBox.top-offBox.top)<=1&&onBox.flat===true&&onBox.oy==='visible'&&onBox.liveIn===true,tag+' TC-R247i THE GAMES BOX IS NOT SQUEEZED: with the switch on the games box starts at '+onBox.top+', as with it off ('+(offBox&&offBox.top)+'), it is no scroller of its own ('+onBox.oy+'), and the games in progress sit inside it above the first finished game ('+onBox.liveIn+'), so they scroll with his games [#553 card 69: the page scrolls]',{off:offBox,on:onBox});
      // ── d: his own games are reviewed live (TC-R261) ──
      const WAITS=/review opens when it ends|Your game/i;
      L.say(!WAITS.test(r0.B.text)&&!WAITS.test(r0.C.text)&&!WAITS.test(r0.A.text)&&/Daily/.test(r0.B.text)&&/\b4 moves played\b/.test(r0.B.text)&&/White to move/.test(r0.B.text)&&!r0.B.off&&/Daily/.test(r0.C.text)&&/\b2 moves played\b/.test(r0.C.text)&&/White to move/.test(r0.C.text)&&!r0.C.off,tag+' TC-R247d TC-R261 OWN GAME LIVE: each game one of his accounts plays in reads like any game in progress, with no wait line - the one that came in on the friend\'s list ("'+r0.B.text+'") and the one from his own ("'+r0.C.text+'")',{B:r0.B.text,C:r0.C.text,A:r0.A.text});
      for(const [k,re,nm,np,r4] of [['B',/gatefriend vs GateMe/,/gatefriend vs GateMe/i,4,['3P4','2PP4']],['C',/GateMe vs OtherPerson/,/GateMe vs OtherPerson/i,2,['2P5']]]){
        const p0=(await read(b)).pos.length;
        let tapped=false;try{const el=b.page.locator('button',{hasText:re}).first();await el.evaluate(e=>e.scrollIntoView({block:'center'}));await b.settle(400);const bx=await el.boundingBox();const cx=bx.x+bx.width/2,cy=bx.y+bx.height/2;
          const hit=await el.evaluate((e,p)=>{const h=document.elementFromPoint(p[0],p[1]);return !!h&&e.contains(h);},[cx,cy]);   // the row itself is under the finger (Playwright's own click refuses an aria-disabled button)
          if(hit){await b.page.mouse.click(cx,cy);tapped=true;}else L.note('tap '+k+': the row is not what is under its own centre');}catch(e){L.note('tap '+k+': '+String(e).replace(/\s+/g,' ').slice(0,300));}
        const wk=await until(b,r=>r.summary&&r.plies!=null,150000);const r=wk.r;const mine=r.pos.slice(p0).filter(f=>r4.indexOf(rank4(f))>=0).length;
        L.say(tapped&&wk.ok&&r.plies===np&&nm.test(r.sumText)&&/In progress/.test(r.sumText)&&new RegExp('\\b'+np+' moves so far').test(r.sumText)&&!WAITS.test(r.sumText)&&mine>=1,tag+' TC-R247d TC-R261 OWN GAME LIVE: a tap on game '+k+' (scrolled on screen, tapped where a finger would) opens its review - '+np+' plies graded, the summary names its players and reads In progress, '+np+' moves so far - and '+mine+' of its positions reached a Stockfish worker',{tapped,ok:wk.ok,plies:r.plies,sum:r.sumText.slice(0,160),mine});
        try{const bk=b.page.locator('[data-ct="rev-back"]');if(await bk.count()){await bk.first().click();await b.settle(700);}await b.tapText(/Back to games/);}catch(e){try{await b.page.locator('[aria-label="Back to games"]').first().click();}catch(e2){L.note('back from '+k+': '+String(e2).slice(0,120));}}
        const wb=await until(b,x=>!x.summary&&!!(x.A&&x.B&&x.C),20000);
        L.say(wb.ok,tag+' TC-R247d TC-R261 and back on the games list from game '+k+'\'s review, the three games in progress are listed again',{summary:wb.r.summary,A:!!wb.r.A,B:!!wb.r.B,C:!!wb.r.C});
      }
      // ── e: A opens ──
      const before=r0;   // the list as first shown, before B, C or A was opened, so e's nothing-kept line covers his own games too
      try{const el=b.page.locator('button',{hasText:/gatefriend vs Stranger99/}).first();await el.scrollIntoViewIfNeeded();await el.click({timeout:4000});}catch(e){L.note('tap A: '+String(e).replace(/\s+/g,' ').slice(0,900));}
      S.plies=8;   // the next answer about gatefriend carries one more move by each side
      const w1=await until(b,r=>r.summary&&r.plies!=null,150000);const r1=w1.r;
      if(L.say(w1.ok&&r1.plies===6&&r1.rvWhite==='gatefriend'&&/gatefriend vs Stranger99/.test(r1.sumText)&&/In progress/.test(r1.sumText)&&/\b6 moves so far/.test(r1.sumText),tag+' TC-R247e the game in progress opens as a review: 6 plies graded, the summary names the players and reads "In progress · 6 moves so far"',{ok:w1.ok,plies:r1.plies,sum:r1.sumText.slice(0,160)})){
        const e4=r1.pos.filter(f=>/P/.test(rank4(f))&&OWN_RANK4.indexOf(rank4(f))<0).length;
        L.say(e4>=6,tag+' TC-R247e the recorder sees the engine at work on A: '+e4+' positions of games opened 1.e4 were posted to Stockfish workers',{posted:r1.pos.length});
        const ag=await L.acctGames(b.page);const held=[];Object.keys(ag.map||{}).forEach(id=>(ag.map[id]||[]).forEach(g=>{if(/\[Result\s+"\*"\]/.test(g.pgn||'')||/Stranger99|OtherPerson/i.test(JSON.stringify(g)))held.push(id);}));
        L.say(ag.from!=='none'&&held.length===0&&r1.starInStore.length===0&&gsKeys(r1.gs).every(k=>HELD_KEY.test(k))&&r1.mm===before.mm&&r1.mb===before.mb,tag+' TC-R247e TC-R261 and nothing of it, or of his own games B and C reviewed before it, is kept: no held game is in progress or names its players, no stored key carries them (but the player-country cache, which names a player and no game), and the review tally, the mistakes drill and the brilliant moves are as they were',{heldInProgress:held,keys:r1.starInStore,from:ag.from,gsBefore:gsKeys(before.gs),gsAfter:gsKeys(r1.gs),mmSame:r1.mm===before.mm,mbSame:r1.mb===before.mb,mmLen:[before.mm.length,r1.mm.length],mbLen:[before.mb.length,r1.mb.length]});
        const ll1=await liveLine(b);
        L.say(liveLineOk(ll1),tag+' TC-R247j THE SUMMARY\'S IN-PROGRESS WORDS ARE NEVER BROKEN: "'+(ll1&&ll1.moves?ll1.moves.t:'?')+'" sits on one line and "'+(ll1&&ll1.at?ll1.at.t:'?')+'" on one line, neither cut',ll1);
        // ── f: it grows, with no tap ──
        const w2=await until(b,r=>r.plies===8&&/\b8 moves so far/.test(r.sumText),80000);const r2=w2.r;
        L.say(w2.ok&&r2.summary,tag+' TC-R247f THE REVIEW GROWS: with no tap, '+Math.round(w2.ms/1000)+'s after the fixture gained a move by each side the open summary reads 8 moves and the review holds 8 graded plies',{plies:r2.plies,sum:r2.sumText.slice(0,160),waitedMs:w2.ms});
        if(w2.ok){const ll2=await liveLine(b);
          L.say(liveLineOk(ll2)&&!!ll1&&ll1.h!=null&&ll2.h===ll1.h,tag+' TC-R247j and as it grows to 8 moves the words stay whole and their block keeps its height ('+(ll1&&ll1.h)+' then '+(ll2&&ll2.h)+'px)',{before:ll1,after:ll2});}
        if(full&&w2.ok){
          let onMoves=false,toEnd=null;try{await R.startReview(b);await R.goPly(b,99);onMoves=await R.inMoves(b);toEnd=(await read(b)).moveLine;}catch(e){L.note('start review: '+String(e).slice(0,160));}
          const bd0=await boardRect(b);const st0=await stripCount(b);
          S.plies=10;
          const w3=await until(b,r=>r.plies===10,80000);await b.settle(1200);const bd1=await boardRect(b);const st1=await stripCount(b);const r3=await read(b);
          L.say(onMoves&&/Nf6/.test(toEnd||'')&&w3.ok&&(await R.inMoves(b))&&/Nf6/.test(st0||'')&&!/Be7/.test(st0||'')&&/O-O/.test(st1||'')&&/Be7/.test(st1||'')&&/Be7/.test(r3.moveLine||''),tag+' TC-R247f and on the move screen, at the last move ('+toEnd+'), the next growth arrives with no tap: the move strip gains 5.O-O Be7, the screen stays on the moves and follows to the new last move ('+r3.moveLine+')',{onMoves,ok:w3.ok,before:st0,after:st1});
          L.say(!!bd0&&!!bd1&&bd0.w>200&&Math.abs(bd0.l-bd1.l)<=0.5&&Math.abs(bd0.t-bd1.t)<=0.5&&Math.abs(bd0.w-bd1.w)<=0.5&&Math.abs(bd0.h-bd1.h)<=0.5,tag+' TC-R247f and the board did not move or change size as the review grew',{before:bd0,after:bd1});
        }
        // ── g: polite ──
        const fr=inProg(S,'gatefriend').map(h=>h.t),me=inProg(S,'gateme').map(h=>h.t);const gaps=[];for(const a of [fr,me])for(let i=1;i<a.length;i++)gaps.push(Math.round((a[i]-a[i-1])/1000));
        L.say(fr.length>=2&&gaps.length>=1&&gaps.every(g=>g>=30)&&toMove(S)===0&&pages(S)===0,tag+' TC-R247g POLITE: '+fr.length+' requests about the open game\'s account, never two about one account within 30 s (gaps '+gaps.join(', ')+' s), none to /games/to-move and none to a chess.com page',{gaps,toMove:toMove(S),pages:S.hits.filter(h=>!/^https:\/\/api\.chess\.com\/pub\//.test(h.u)).map(h=>h.u).slice(0,3)});
        if(full){
          try{const bk=b.page.locator('[data-ct="rev-back"]');if(await bk.count()){await bk.first().click();await b.settle(700);}await b.tapText(/Back to games/);}catch(e){try{await b.page.locator('[aria-label="Back to games"]').first().click();}catch(e2){L.note('back: '+String(e2).slice(0,120));}}
          await b.settle(4000);const rb=await read(b);const n0=inProg(S).length;await b.settle(50000);const n1=inProg(S).length;
          L.say(!rb.summary&&rb.games>=2&&n1===n0,tag+' TC-R247g and once the review is closed nothing more is asked: back on the games list, no request about a game in progress in the next 50 s ('+n0+' before, '+n1+' after)',{summary:rb.summary,games:rb.games});
        }
      }
    }
    L.say(b.errs.length===0,tag+' TC-R247h zero app errors',b.errs.slice(0,3));
    await b.close();
  }
},'176-review-game-in-progress');
// SELECTOR-OPENED: live-section reading=presence the layout line (TC-R247h) needs the section's own box, so a missing hook reads null and reds; the two absence lines (a, b) also read the page's words and the route's request count, which no hook feeds
