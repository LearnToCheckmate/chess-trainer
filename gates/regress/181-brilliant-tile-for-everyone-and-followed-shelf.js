'use strict';
// gates/regress/181-brilliant-tile-for-everyone-and-followed-shelf.js - THE BRILLIANT TILE FOR EVERYONE (q2) AND THE SHELF OF THE PLAYERS HE
// FOLLOWS (q4). US-R176 / TC-R250a..k.
//
// WHY [batch 13, jobs/brilliancy-library-and-motif-coverage-2026-09-23; his Desk answers of 19 Nov 2026 to run-questions
// build__1795066268355-q2 and -q4]: q2 "the Brilliant tile for everyone": the tile shows on Review for every player, reading "Famous
// brilliant moves" until the player has a brilliant move of his own, then its usual label. q4 "a shelf of the players he follows": the
// brilliant moves of the players he follows (a followed account he marked not his) are their own shelf in the library, labelled by player.
// His words, 23 Sep: "I'd like to see his brilliant moves without actually having to keep importing them".
//
// WHAT IT READS: chess.jsx through gates/engine-extract.js for the node lines (followBrilCards, brilWhyOf, followBrilMerge - the shipped
// functions), and the bundle under test (CT_APP) at kunal761 and 320x568 for the screen lines, AFTER interaction: the tile is tapped, the
// library read, a kind chosen, the drill started and its first card solved; and at kunal761 a real review of a followed player's game is
// run and what it stored is read back.
// NOT THE SAME OBJECT TWICE: the tile is found by its WORDS ("Famous brilliant moves" / "Your brilliant moves"), not by the bril-tile hook
// alone, and the followed shelf by its heading's words ("From peterpatzer · 2"); the card the review stores is pinned to a fact about the
// game (the Opera Game's 10.Nxb5 is c3b5 and 16.Qb8+ is b3b8, both White's, and White is the followed player), not to a count the gate
// computes from the same code.
// ON THE REAL TREE: 56/0 on trial aaa4aa766f90 (chess.jsx c1151f17f60c, the code of 92844de0), 20 Nov 2026; 164-review-list-fixed-page 17/0 on the same trial.
// CONTROL-RECORD: 92844de0 2026-11-20 total=56 red=31 scope=trial:e87c39ce3318 how=batch 13 break A (gates/pairs/breaks/g181-famous-tile-only-for-a-store.diff): the tile shows only for a store with a card in it - TC-R250d, e, f, h, i red at both sizes and the e2e shelf line (j); node lines green
// CONTROL-RECORD: 92844de0 2026-11-20 total=56 red=9 scope=trial:9fe9ad8708c6 how=batch 13 break B (g181-no-followed-shelf.diff): the followed cards are kept but the library shows no shelf - TC-R250h x2 and i x2 at both sizes, and j's next-visit shelf line
// CONTROL-RECORD: 92844de0 2026-11-20 total=56 red=5 scope=trial:0e7407f09883 how=batch 13 break C (g181-followed-card-says-you.diff, CT_SRC its chess.jsx): brilWhyOf leaves the sentence in the second person - node TC-R250b x2, TC-R250i at both sizes ('You gave up the bishop'), TC-R250k
// CONTROL-RECORD: 92844de0 2026-11-20 total=56 red=3 scope=trial:1f2ec4cb4b80 how=batch 13 control D (not a pairs break): the review of a followed account's game keeps nothing (the else-branch off) - TC-R250j x2 and TC-R250k at kunal761; every seeded-store line stays green, which is why the end-to-end review is in this gate
const L=require('../lib');
const E=require('../engine-extract.js');
const R=require('../drive/review');
const T=require('../brilliant-fixed-tests.json').tests;
const GEOS=(process.env.CT_G181_GEOS||'kunal761,se').split(',');
const mvOf=(pos,san)=>E.getLegal(pos).find(x=>E.cleanSAN(E.toSAN(pos,x,E.applyMove(pos.board,x)))===E.cleanSAN(san));
const uciOf=(m)=>E.rc2sq(m.fr,m.fc)+E.rc2sq(m.tr,m.tc)+(m.promo||'');
const rowFor=(pos,m,ev)=>({cls:{label:'Brilliant'},gate:E.brilliantGate(pos,m,0,0.5,0.5,null),motifs:E.moveMotifs(pos,m),evalAfter:ev,forkT:E.forkTargets(pos,m)});
// a followed player's card, built the way the app builds one (followBrilCards over a one-row review)
const folCard=(id,acct)=>{const t=T.find(x=>x.id===id);const pos=E.fromFEN(t.fen);const m=mvOf(pos,t.san);const c=E.followBrilCards([rowFor(pos,m,pos.turn==='w'?2.4:-2.4)],[pos],[{move:m}],pos.turn,acct,0)[0];delete c._i;c.no=17;return c;};
const ownCard=(id)=>{const t=T.find(x=>x.id===id);const pos=E.fromFEN(t.fen);const m=mvOf(pos,t.san);return {fen:t.fen,uci:uciOf(m),label:'Brilliant',ts:1791000000000,last:null,why:'You give up a piece here, and it holds.',no:17};};
L.run(async()=>{
  L.note('181: chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5);
  // ── node: the cards a followed player's review keeps ─────────────────────────────────────────────────────────────────────────────
  {const res=E.loadSANs(E.parsePGN(R.PGN_OPERA));const plies=res.plies,positions=res.positions;
   const idx=(san,from)=>{for(let i=from||0;i<plies.length;i++)if(plies[i].san===san)return i;return -1;};
   const iN=idx('Nxb5'),iQ=idx('Qb8+'),iC=idx('cxb5');
   const out=plies.map((p,i)=>({cls:{label:'Best'}}));
   for(const i of [iN,iQ,iC])out[i]=rowFor(positions[i],plies[i].move,positions[i].turn==='w'?3:-3);   // 10...cxb5 is Black's: never kept for White's player
   L.say(iN===18&&iQ===30&&iC===19,'node TC-R250a PRECONDITION the Opera Game replays and its three marked plies are where the game has them (10.Nxb5 ply '+iN+', 10...cxb5 '+iC+', 16.Qb8+ '+iQ+')');
   const cs=E.followBrilCards(out,positions,plies,'w','cc:jsmiller1112',0);
   L.say(cs.length===2&&cs[0].uci==='c3b5'&&cs[1].uci==='b3b8'&&cs[0].no===10&&cs[1].no===16&&cs.every(c=>c.who==='jsmiller1112'&&c.acct==='cc:jsmiller1112'&&c.label==='Brilliant'&&c.fen===E.toFEN(positions[c._i])),'node TC-R250a a review of a followed player\'s game keeps HIS Brilliant moves only - 10.Nxb5 and 16.Qb8+, White\'s, each naming him and its account, move number and position; the opponent\'s 10...cxb5 is not kept ('+cs.map(c=>c.no+'.'+c.uci).join(', ')+')',cs.map(c=>({uci:c.uci,no:c.no,who:c.who})));
   L.say(cs.length===2&&cs.every(c=>/^jsmiller1112 gave up the /.test(c.why)&&!/\byou\b/i.test(c.why)),'node TC-R250b each card\'s sentence names the player and never says "you" ("'+(cs[0]&&cs[0].why)+'" / "'+(cs[1]&&cs[1].why)+'")');
   const none=[E.followBrilCards(out,positions,plies,'b','cc:x',0).length,E.followBrilCards(out,positions,plies,'w','',0).length,E.followBrilCards().length];
   L.say(none[0]===1&&none[1]===0&&none[2]===0,'node TC-R250a with Black as the player only 10...cxb5 is kept; with no account or no review, nothing ('+none.join(', ')+')');}
  // ── node: the sentence in the third person, over every shape the card sentence can take ────────────────────────────────────────
  {const gates=[{gT:'b',gSq:'h7',capT:'p'},{gT:'n',gSq:'f5',arm:'hang'},{gT:'q',gSq:'b8'},{sac:9},{sac:5},{sac:3},{sac:1},{sac:0}];
   const mos=[[],['mate'],['fork'],['discovered check'],['promotion']];const evs=[2.4,-2.4,99,-99,null];
   const refs=['If Bxh7, Qh5+ and you are winning.','If Bxh7, Qh5+ and you hold.','If Bxh7, Qh5+ and you keep a clear edge.'];
   const bad=[];let n=0;
   for(const g of gates)for(const mo of mos)for(const ev of evs)for(const mc of ['w','b'])for(const ref of [null,...refs]){
     const s=E.brilCardWhy({gate:g,motifs:mo,evalAfter:ev,forkT:[]},mc,ref);const w=E.brilWhyOf(s,'peterpatzer');n++;
     if(/\byou\b/i.test(w)||!/^peterpatzer /.test(w))bad.push(w);}
   L.say(n>=1000&&bad.length===0,'node TC-R250b over all '+n+' card sentences the app can write (the piece given, left or offered; each closing; both sides; each refutation ending) the followed player\'s copy names him first and says "you" nowhere',bad.slice(0,4));}
  // ── node: the store ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  {const a={fen:'f1',uci:'a1a2'},b={fen:'f2',uci:'a1a2'},c={fen:'f1',uci:'a1a3'};
   const m1=E.followBrilMerge([a],[b,a,c,b]);const big=E.followBrilMerge([],Array.from({length:400},(x,i)=>({fen:'p'+i,uci:'a1a2'})));
   L.say(m1.map(x=>x.fen+x.uci).join(',')==='f2a1a2,f1a1a3,f1a1a2'&&big.length===E.FOLLOW_BRIL_MAX&&big[0].fen==='p0'&&E.followBrilMerge().length===0&&E.FOLLOW_BRIL_K==='ct_followbril','node TC-R250c the store keeps one card a position and move, the newest first, at most '+E.FOLLOW_BRIL_MAX+', under ct_followbril ('+m1.map(x=>x.fen+x.uci).join(',')+'; 400 in, '+big.length+' kept)');}
  // ── the screen ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const FOL=[folCard('FT01','cc:peterpatzer'),folCard('FT02','cc:peterpatzer'),folCard('FT01','cc:gone')];   // the third is the same move from an account he no longer follows
  const MINE_FOL=folCard('FT02','cc:myother');   // an account he marked HIS: its card is never on a followed shelf
  const tileRead=(b)=>b.page.evaluate(()=>{const painted=(x)=>{const q=x.getBoundingClientRect();return q.width>0&&q.height>0;};
    const lab=[...document.querySelectorAll('body *')].filter(x=>x.children.length===0&&painted(x)&&/^(Famous|Your) brilliant moves$/.test((x.textContent||'').trim()));
    const t=lab.map(x=>{const btn=x.closest('button');const r=(btn||x).getBoundingClientRect();const box=document.querySelector('[data-ct="glist-box"]');const bq=box&&box.getBoundingClientRect();
      return {label:(x.textContent||'').trim(),text:btn?(btn.innerText||'').replace(/\s+/g,' ').trim():null,t:r.top,b:r.bottom,l:r.left,r:r.right,h:r.height,inBox:!!(box&&box.contains(x)),inPractice:!!x.closest('[data-ct="practice-row"]'),ink:(()=>{const q=x.getBoundingClientRect();return {h:q.height};})(),box:bq?{t:bq.top,b:bq.bottom,h:bq.height,st:box.scrollTop}:null};});
    const root=document.getElementById('root');const row=document.querySelector('[data-ct="game-row"]');
    return {tiles:t,vw:innerWidth,vh:innerHeight,root:{sh:root.scrollHeight,ch:root.clientHeight},rowH:row?row.getBoundingClientRect().height:null};});
  const tapTile=async(b,label)=>{const el=b.page.locator('button',{hasText:label}).first();await el.scrollIntoViewIfNeeded({timeout:3000}).catch(()=>{});await el.click({timeout:4000}).catch(()=>{});await b.settle(800);};
  const lib=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="bril-lib"]');const painted=(x)=>{const q=x.getBoundingClientRect();return q.width>0&&q.height>0;};
    const heads=[...document.querySelectorAll('body *')].filter(x=>x.children.length===0&&painted(x)&&/^From .+ · \d+$/i.test((x.innerText||'').trim())).map(x=>(x.innerText||'').trim());
    const fk=[...document.querySelectorAll('[data-ct="bril-fkind"]')].map(e=>{const r=e.getBoundingClientRect();return {k:e.getAttribute('data-k'),tx:(e.innerText||'').replace(/\s+/g,' ').trim(),h:r.height,l:r.left,r:r.right};});
    const go=document.querySelector('[data-ct="bril-lib-go"]');return {lib:!!s,heads,fk,go:go?(go.innerText||'').trim():null,goDis:go?go.disabled:null,vw:innerWidth};});
  const drill=(b)=>b.page.evaluate(()=>{const c=document.querySelector('[data-ct="drill-counter"]');const top=document.querySelector('[data-ct="pz-top"]');const msg=document.querySelector('[data-ct="pz-msg"]');
    return {lib:!!document.querySelector('[data-ct="bril-lib"]'),counter:c?(c.innerText||'').replace(/\s+/g,' ').trim():null,cut:c?(c.scrollWidth-c.clientWidth):null,top:top?(top.innerText||'').replace(/\s+/g,' ').trim():null,msg:msg?(msg.innerText||'').replace(/\s+/g,' ').trim():null,vh:innerHeight};});
  const stored=(b,k)=>b.page.evaluate((k)=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return 'unreadable';}},k);
  const NCL=(E.BRIL_CLASSIC_CARDS||[]).length;
  for(const geo of GEOS){
    // 1. q2: a new player - no card of his own, no games - sees the tile, it says Famous, and it opens the famous shelf and its drill
    {const b=await L.launch({geo,name:'b181-new-'+geo,store:{ct_bril_reset_v1:'1',ct_pool:'3'}});await b.open();
     await b.tile('Review').catch(()=>{});await b.settle(1200);const t=await tileRead(b);const f=t.tiles.filter(x=>x.label==='Famous brilliant moves');
     L.say(t.tiles.length===1&&f.length===1&&!f[0].inBox,geo+' TC-R250d a player with no brilliant move of his own and no games sees ONE Brilliant tile on Review, reading "Famous brilliant moves" ('+JSON.stringify(t.tiles.map(x=>x.label))+')',t.tiles);
     L.say(f.length===1&&/^(✨ )?Famous brilliant moves (\u203a )?/.test(f[0].text||'')&&(f[0].text||'').replace(/^(✨ )?Famous brilliant moves (\u203a )?/,'').replace(/ \u203a$/,'')===NCL+' from famous games · can you find them?'&&f[0].h>=44&&f[0].l>=0&&f[0].r<=t.vw+0.5&&f[0].b<=t.vh,geo+' TC-R250d the tile says what it holds ("'+(f[0]&&f[0].text)+'"; since batch 13 Q25 B the sentence is kept for a screen reader, not painted, and under 360 wide the card drops its icon square), is a full tap target ('+(f[0]&&Math.round(f[0].h))+'px) and on screen');
     await tapTile(b,'Famous brilliant moves');const l=await lib(b);
     L.say(l.lib&&l.heads.length===1&&l.heads[0].toUpperCase()===('From famous games · '+NCL).toUpperCase()&&l.go==='Practice all '+NCL&&l.goDis===false,geo+' TC-R250e tapping it opens the library on the famous-games shelf, and Practice all takes all '+NCL+' famous moves (heads '+JSON.stringify(l.heads)+', "'+l.go+'")');
     await b.page.locator('[data-ct="bril-lib-go"]').click({timeout:3000}).catch(()=>{});await b.settle(1500);const d=await drill(b);
     L.say(!d.lib&&d.counter==='✨ Famous games · 1 of '+NCL+' ▾'&&d.cut!==null&&d.cut<=0.5,geo+' TC-R250e the drill opens on the famous deck ("'+d.counter+'"), its header whole');
     const st=await stored(b,'ct_mybrilliancies');L.say(Array.isArray(st)&&st.length===0,geo+' TC-R250e his own list is still empty: the famous moves are not his',st);
     L.say(b.errs.length===0,geo+' TC-R250e zero app errors',b.errs.slice(0,3));await b.close();}
    // 2. q2 with games listed: the famous tile is one compact card in the practice row (batch 13 Q25 B; it was the games box's first row), and the page still does not scroll
    // the store is gate 164's: one account and 40 games, the fixed Review page (only the games box scrolls) that q45 settled
    {const DAY=86400000;const games=[];for(let i=0;i<40;i++)games.push({src:'cc',acct:'jsmiller1112',pgn:R.PGN_OPERA,white:'Jsmiller1112',black:'Opponent'+i,wr:(i%3?'win':'checkmated'),tc:'blitz',date:Date.now()-(i+1)*DAY});
     const st={ct_accts:['cc:jsmiller1112'],ct_acctgames:{'cc:jsmiller1112':games},ct_pool:'3',ct_bril_reset_v1:'1'};
     const b=await L.launch({geo,dev:false,name:'b181-games-'+geo,store:st});await b.open();await b.tile('Review').catch(()=>{});await b.settle(1500);
     const t=await tileRead(b);const f=t.tiles.find(x=>x.label==='Famous brilliant moves');
     // batch 13, jobs/review-list-the-search-box-on-the-your-games-line-and-the-final-layout-2026-11-18 (Q25 B, FB-03): the tile is a PRACTICE CARD
     // in the row under the PGN box, not a row of the games box - the job moved it; this line followed. Its name is one painted line (the label's
     // own box at most 24px tall), the card a full tap target, above the games box and outside it.
     L.say(t.tiles.length===1&&!!f&&!f.inBox&&f.inPractice&&f.ink.h<=24&&f.h>=44&&!!f.box&&f.b<=f.box.t+0.5&&f.box.st===0,geo+' TC-R250f with his games listed the Famous tile is a practice card above the games box (not in it), its name one line and the card a full tap target ('+(f&&Math.round(f.h))+'px, its name '+(f&&Math.round(f.ink.h))+'px, box '+(f&&f.box&&Math.round(f.box.t)+'-'+Math.round(f.box.b))+')',f);
     L.say(t.root.sh<=t.root.ch+1&&!!f&&!!f.box&&t.rowH>0&&f.box.h>=t.rowH+12,geo+' TC-R250f the Review page still does not scroll with the tile in (#root '+t.root.sh+' in '+t.root.ch+'), and the games box still holds one whole game with the next one starting (box '+(f&&f.box&&Math.round(f.box.h))+'px, a game '+(t.rowH&&Math.round(t.rowH))+'px)');
     await tapTile(b,'Famous brilliant moves');const l=await lib(b);
     L.say(l.lib&&l.heads.some(h=>/^From famous games/i.test(h)),geo+' TC-R250f tapping it opens the library ('+JSON.stringify(l.heads)+')');
     L.say(b.errs.length===0,geo+' TC-R250f zero app errors',b.errs.slice(0,3));await b.close();}
    // 3. q2: once a card is his, the tile is his usual one, in its usual place; with the library switched off and no card, there is no tile
    {const b=await L.launch({geo,name:'b181-own-'+geo,store:{ct_bril_reset_v1:'1',ct_pool:'3',ct_mybrilliancies:[ownCard('FT01')]}});await b.open();
     await b.tile('Review').catch(()=>{});await b.settle(1200);const t=await tileRead(b);
     L.say(t.tiles.length===1&&t.tiles[0].label==='Your brilliant moves'&&/1 brilliant move you found/.test(t.tiles[0].text||''),geo+' TC-R250g with one brilliant move of his own the tile reads "Your brilliant moves" and counts it ("'+(t.tiles[0]&&t.tiles[0].text)+'")');
     await b.close();
     const c=await L.launch({geo,name:'b181-off-'+geo,store:{ct_bril_reset_v1:'1',ct_pool:'3',ct_bril_lib:'0'}});await c.open();
     await c.tile('Review').catch(()=>{});await c.settle(1200);const t2=await tileRead(c);
     L.say(t2.tiles.length===0,geo+' TC-R250g with the library switched off (ct_bril_lib 0) a player with no card of his own has no Brilliant tile, as before ('+t2.tiles.length+')');
     await c.close();}
    // 4. q4: the followed player's shelf - labelled by him, only for accounts still followed and still not his, practised as his deck, never his
    {const store={ct_bril_reset_v1:'1',ct_pool:'3',ct_accts:['cc:peterpatzer','cc:myother'],ct_acctmine:{'cc:peterpatzer':false},ct_followbril:[FOL[0],FOL[1],FOL[2],MINE_FOL]};
     const b=await L.launch({geo,name:'b181-fol-'+geo,store});await b.open();await b.tile('Review').catch(()=>{});await b.settle(1200);
     const t=await tileRead(b);const f=t.tiles.find(x=>x.label==='Famous brilliant moves');
     L.say(!!f&&/ · 2 from players you follow · /.test(f.text||''),geo+' TC-R250h the tile counts the followed players\' moves too ("'+(f&&f.text)+'")');
     await tapTile(b,'Famous brilliant moves');const l=await lib(b);const fh=l.heads.filter(h=>!/^From famous games/i.test(h));
     L.say(l.lib&&fh.length===1&&fh[0].toUpperCase()==='FROM PETERPATZER · 2',geo+' TC-R250h the library carries ONE followed shelf, labelled by the player and counting his two moves ('+JSON.stringify(fh)+'); none for an account no longer followed (cc:gone) or one marked his (cc:myother)');
     L.say(l.fk.length===1&&l.fk[0].tx==='Greek gift 2'&&l.fk[0].k==='follow:cc:peterpatzer|greek-gift'&&l.fk[0].h>=43.5&&l.fk[0].l>=0&&l.fk[0].r<=l.vw+0.5,geo+' TC-R250h his shelf groups his moves by kind, each kind a full-size chip inside the screen ('+JSON.stringify(l.fk)+')');
     await b.page.locator('[data-ct="bril-fkind"]').first().click({timeout:3000}).catch(()=>{});await b.settle(300);const l2=await lib(b);
     L.say(l2.go==='Practice these 2',geo+' TC-R250i with his kind chosen the button counts his deck ("'+l2.go+'")');
     await b.page.locator('[data-ct="bril-lib-go"]').click({timeout:3000}).catch(()=>{});await b.settle(1500);const d=await drill(b);const bd0=await b.board();
     L.say(!d.lib&&d.counter==='✨ peterpatzer · 1 of 2 ▾'&&d.cut!==null&&d.cut<=0.5,geo+' TC-R250i the drill\'s header names the player ("'+d.counter+'"), whole');
     const TALL=d.vh>=740;
     L.say(TALL?/White to move\. Played by peterpatzer\. Find the brilliant move\.$/.test(d.top||''):/🎯 White to move$/.test(d.top||''),geo+' TC-R250i '+(TALL?'the goal names whose move it was':'on a phone under 740 tall the goal is the one line his own cards have')+' ("'+(d.top||'').slice(-60)+'")');
     let solved=true;try{await b.move('e4','h7',0);await b.settle(2500);}catch(e){solved=false;}
     const d2=await drill(b);const bd1=await b.board();
     L.say(solved&&/^(🎉\s*)?peterpatzer gave up the bishop/.test(d2.msg||'')&&!/\byou\b/i.test((d2.msg||'').replace(/^🎉\s*/,'').split('.')[0]),geo+' TC-R250i Bxh7+ solves it and the explanation names the player, not "you" ("'+(d2.msg||'').slice(0,80)+'")');
     L.say(!!bd0&&!!bd1&&Math.abs(bd1.y-bd0.y)<0.5&&Math.abs(bd1.w-bd0.w)<0.5,geo+' TC-R250i the board did not move when the card was solved',{bd0,bd1});
     const mb=await stored(b,'ct_mybrilliancies');const fb=await stored(b,'ct_followbril');
     L.say(Array.isArray(mb)&&mb.length===0&&Array.isArray(fb)&&fb.length===4,geo+' TC-R250i his moves are not yours: his own list is still empty and the followed store is untouched ('+(mb&&mb.length)+' / '+(fb&&fb.length)+')');
     L.say(b.errs.length===0,geo+' TC-R250i zero app errors',b.errs.slice(0,3));await b.close();}
  }
  // 5. q4 end to end, on his phone: a real review of a followed player's game keeps that player's moves for the shelf, and none for him
  if(GEOS.indexOf('kunal761')>=0&&process.env.CT_G181_E2E!=='0'){
    const st=Object.assign({},R.SEED,{ct_pool:'3',ct_bril_reset_v1:'1',ct_acctmine:{'cc:jsmiller1112':false}});
    const b=await L.launch({geo:'kunal761',name:'b181-e2e',store:st});await b.open();let ok=true;
    try{await b.tile('Review');await b.settle(1200);await b.tapText(/DukeKarlCountIsouard99/,{wait:1500});await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await b.settle(10000);}catch(e){ok=false;}
    const fb=await stored(b,'ct_followbril')||[];const mb=await stored(b,'ct_mybrilliancies')||[];const by=(u)=>(Array.isArray(fb)?fb:[]).find(c=>c.uci===u);
    L.say(ok&&!!by('c3b5')&&!!by('b3b8')&&fb.every(c=>c.acct==='cc:jsmiller1112'&&c.who==='jsmiller1112'&&!('_i' in c)),'kunal761 TC-R250j a review of a game of a player he follows (jsmiller1112, marked not his) keeps that player\'s Brilliant moves for his shelf - 10.Nxb5 and 16.Qb8+ among them ('+(Array.isArray(fb)?fb.map(c=>c.no+'.'+c.uci).join(', '):fb)+')');
    L.say(Array.isArray(mb)&&mb.length===0,'kunal761 TC-R250j and nothing for his own list ('+(Array.isArray(mb)?mb.length:mb)+')');
    L.say(/^jsmiller1112 gave up the knight for a pawn\. If cxb5, Bxb5\+/.test((by('c3b5')||{}).why||'')&&/^jsmiller1112 gave up the queen on b8\. If Nxb8, Rd8#\.$/.test((by('b3b8')||{}).why||''),'kunal761 TC-R250k the stored sentences name the player and give the line after the capture ("'+((by('c3b5')||{}).why||'')+'" / "'+((by('b3b8')||{}).why||'')+'")');
    await b.page.keyboard.press('Escape').catch(()=>{});
    L.say(b.errs.length===0,'kunal761 TC-R250j zero app errors',b.errs.slice(0,3));await b.close();
    const c=await L.launch({geo:'kunal761',name:'b181-e2e-shelf',store:Object.assign({},st,{ct_followbril:Array.isArray(fb)?fb:[]})});await c.open();await c.tile('Review').catch(()=>{});await c.settle(1200);
    await tapTile(c,'Famous brilliant moves');const l=await lib(c);
    L.say(l.heads.some(h=>h.toUpperCase()==='FROM JSMILLER1112 · '+(Array.isArray(fb)?fb.length:-1)),'kunal761 TC-R250j the next visit, the library shows his shelf: '+JSON.stringify(l.heads));
    await c.close();
  }
},'181-brilliant-tile-for-everyone-and-followed-shelf');
// SELECTOR-OPENED: bril-fkind reading=presence the chips are also read by their words and the shelf by its heading (TC-R250h)
// SELECTOR-OPENED: bril-lib reading=presence the library's shelves are read by their headings' words (TC-R250e, h)
// SELECTOR-OPENED: bril-lib-go reading=presence the button's words (TC-R250e, i)
// SELECTOR-OPENED: glist-box reading=presence the games box the compact tile must sit in (TC-R250f); if it is missing inBox is false, red
// SELECTOR-OPENED: drill-counter reading=presence TC-R250e, i need the counter's words
// SELECTOR-OPENED: pz-top reading=presence TC-R250i reads the card's goal
// SELECTOR-OPENED: pz-msg reading=presence TC-R250i reads the explanation
