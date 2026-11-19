'use strict';
// gates/regress/168-brilliant-famous-games.js - THE BRILLIANT LIBRARY'S FAMOUS-GAMES SHELF, AND THE KINDS THAT READ THE LINE. US-R162 / TC-R233a..m.
//
// WHY [batch 13, jobs/brilliancy-library-and-motif-coverage-2026-09-23; Kunal, 23 Sep 2026: "we might also want to give a whole set of
// brilliant moves that people might be able to learn from. Because I think I learned one brilliant move and I keep playing that again
// and again"; 30 Sep: "if somebody wants to see like two or three different kinds of brilliance then they can like click on those"]:
// the library built at #550 showed him only his own Brilliants, so a player whose Brilliants are all one kind (his own diagnosis: the
// bishop on the pawn by the king) met no other kind. This build bundles Brilliant moves from famous games (seeding source 3 of the job),
// each one a move the APP'S OWN engine and rule grade Brilliant (gates/make-brilliancy-classics.js), tags them with the rules that read
// the line (king hunt, drawing the king out, deflection, interference, clearance, positional sacrifice), and shows them as a third
// section of the library: the kinds he has NOT played first, each a chip that puts that small deck into the same drill.
//
// WHAT IT READS: chess.jsx through gates/engine-extract.js for the node lines (the table, the tagger), and the bundle under test
// (CT_APP) at kunal761 and at 320x568 for the screen lines. The screen lines are driven AFTER interaction: the sheet is scrolled, kinds
// are chosen, the drill is started and its first card is solved.
// NOT THE SAME OBJECT TWICE: the counts on the chips are compared with counts this gate computes from chess.jsx, which is the same
// logic as the bundle - so the lines that matter are ALSO pinned to facts about chess: the king-hunt deck opens on Edward Lasker v
// Thomas, London 1912, and its answer is the queen from h5 to h7; the Opera Game's Qb8+ is a deflection and a back-rank mate; the
// king mated on g1 in Lasker v Thomas is NOT a back-rank mate. A table or tagger that drifts fails those whatever it computes.
// ON THE REAL TREE: 64/0 on trial 5f50cef175ce (chess.jsx ead9b155bbbd), 19 Nov 2026. The controls below ran on the tree two explanation sentences earlier (chess.jsx 5714d500c9d8, real-tree trial 3c6a5b681eb1, also 64/0); the pair re-runs breaks A, B and C on the committed head.
// CONTROL-RECORD: 76d9e736 2026-11-19 total=36 red=29 scope=default:dd8b009fc3f8 how=batch 13: THE TREE BEFORE THE SHELF (CT_SRC the chess.jsx of 76d9e736~1, md5 893d670340e1, and its app.js): no table, no line kinds, no shelf - 7 pass, 29 red
// CONTROL-RECORD: 76d9e736 2026-11-19 total=64 red=32 scope=trial:71a8d16c0fb1 how=batch 13 break A (gates/pairs/breaks/g168-one-kind-tile-starts-the-drill.diff): the one-kind player's tile starts the drill again, so the shelf is unreachable for the player the job is for - every screen line of the one-kind and mixed launches red at both sizes, node lines green
// CONTROL-RECORD: 76d9e736 2026-11-19 total=64 red=7 scope=trial:e017a63b089a how=batch 13 break B (g168-famous-card-reads-as-his-own.diff): a famous card carries no name - the header reads Your brilliant moves, the goal and the explanation name nobody; TC-R233m red at both sizes (header, name, mixed deck; at 320 the old header is also 17px cut)
// CONTROL-RECORD: 76d9e736 2026-11-19 total=64 red=19 scope=trial:6bfadae53cbc how=batch 13 break C (g168-shelf-does-not-read-the-line.diff): brilKinds withholds the line, so King hunt, Deflection, Drawing the king out and Clearance vanish from the shelf - node TC-R233g, and TC-R233i, j, l, m at both sizes red
// CONTROL-RECORD: 76d9e736 2026-11-19 total=64 red=4 scope=trial:40c573dddcd1 how=batch 13 control D (not a pairs break): the Practice button scrolls away with the shelves (the sheet scrolls as one box) - both TC-R233k button lines red at both sizes (button at 923-971 of 761, 952-1000 of 568)
// CONTROL-RECORD: 76d9e736 2026-11-19 total=64 red=2 scope=trial:e922f8502f5f how=batch 13 control E (not a pairs break): starting a deck writes the famous cards into his own stored list - TC-R233m 'the famous moves are not his' red at both sizes (6 stored, 4 of theirs)
const L=require('../lib');
const E=require('../engine-extract.js');
const M=require('../make-brilliancy-classics.js');
const T=require('../brilliant-fixed-tests.json').tests;
const card=(id,extra)=>{const t=T.find(x=>x.id===id);const pos=E.fromFEN(t.fen);const m=E.getLegal(pos).find(x=>E.cleanSAN(E.toSAN(pos,x,E.applyMove(pos.board,x)))===E.cleanSAN(t.san));
  return Object.assign({fen:t.fen,uci:E.rc2sq(m.fr,m.fc)+E.rc2sq(m.tr,m.tc)+(m.promo||''),label:'Brilliant',ts:1791000000000,last:null,why:'You give up a piece here, and it holds.',no:20},extra||{});};
const GG=[card('FT01'),card('FT02')];   // the one-kind player: two Greek gifts, nothing else
const CL=E.BRIL_CLASSIC_CARDS||[];const byId=(id)=>CL.find(c=>c.classic===id);
const tagsOf=(c,noLine)=>{const pos=E.fromFEN(c.fen),m=E.uciToMove(pos,c.uci);const g=E.brilliantGate(pos,m,0,0.5,0.5,null);return {g,m,t:E.brilMotifs(pos,m,g,noLine?undefined:c.line)};};
const has=(c,tag,conf)=>!!c&&tagsOf(c).t.tags.some(x=>x.tag===tag&&(!conf||x.conf===conf));
const LINE_TAGS=['king-hunt','attraction','deflection','interference','clearance','positional-sac'];
const GEOS=(process.env.CT_G168_GEOS||'kunal761,se').split(',');
L.run(async()=>{
  // ── node: the table ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  L.note('168: chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5);
  L.say(CL.length>0,'node TC-R233a PRECONDITION the famous-games table is not empty ('+CL.length+' rows)');
  // batch 13 lead, on seat B1's report of job 3: brilBetween() looped for ever on bare or same-square input (NaN never equals NaN;
  // a zero step never reaches its end), so gate 79 X2, which calls every exported function bare, timed out at 900s. Run each call
  // in a worker with a 5s limit so the hang is a red here, not a hung gate.
  // CONTROL-RECORD batch 13 lead: TC-R233n on chess.jsx 057f3b41371c (before the guard) reads ["HUNG","false","true","false"], 1 FAIL (41 pass at kunal761 only); after the guard 65 pass, 0 fail on trial 6e23b857a674.
  {const {Worker}=require('worker_threads');const EX=require.resolve('../engine-extract.js');
   const probe=(args)=>new Promise(res=>{const w=new Worker('const {parentPort,workerData}=require("worker_threads");const E=require(workerData.p);parentPort.postMessage(String(E.brilBetween(...workerData.a)))',{eval:true,workerData:{p:EX,a:args}});const t=setTimeout(()=>{w.terminate();res('HUNG');},5000);w.on('message',m=>{clearTimeout(t);w.terminate();res(m);});w.on('error',e=>{clearTimeout(t);res('ERR '+e.message);});});
   const got=[await probe([]),await probe([1,1,0,0,0,0]),await probe([1,1,0,0,3,3]),await probe([1,2,0,0,3,3])];
   L.say(got[0]==='false'&&got[1]==='false'&&got[2]==='true'&&got[3]==='false','node TC-R233n brilBetween returns at once on bare input and on from===to (false), and still finds a square between on a diagonal (true) and not off it (false)',got);}
  let gen=null,genErr=null;try{const {games,meas}=M.load();gen=Object.assign(M.rowsFrom(games,meas),{meas,games});}catch(e){genErr=String(e&&e.message||e);}
  const want=gen?gen.out.map(c=>JSON.stringify([c.id,c.who,c.fen,c.uci,c.no,c.line,c.why])):[];const have=(E.BRIL_CLASSICS||[]).map(r=>JSON.stringify(r));
  L.say(!!gen&&want.length>0&&have.length===want.length&&have.every((x,i)=>x===want[i]),'node TC-R233a every row is one the game scores and the measured record generate: each game replays move by move, each row\'s move is one the app\'s own engine and rule graded Brilliant (depth '+(gen&&gen.meas.depth)+', rule '+(gen&&gen.meas.rule)+'), and chess.jsx carries exactly those rows ('+have.length+' in chess.jsx, '+want.length+' generated'+(genErr?'; '+genErr:'')+')');
  L.say(!!gen&&gen.refused.length===0,'node TC-R233a no explanation is written for a move the app does not grade Brilliant ('+(gen?gen.refused.length:'?')+')',gen&&gen.refused);
  {const bad=[];const seen=new Set();
   for(const c of CL){const k=c.fen+'|'+c.uci;const why=[];if(seen.has(k))why.push('twice');seen.add(k);
     let pos=null,m=null;try{pos=E.fromFEN(c.fen);m=E.uciToMove(pos,c.uci);}catch(e){}
     if(!m)why.push('move not legal');else{const g=E.brilliantGate(pos,m,0,0.5,0.5,null);if(!g.isSac)why.push('not a sacrifice by the gate');
       let p2=E.makeMove(pos,m),n=0;for(const s of c.line){const x=E.findMoveBySAN(p2,s);if(!x)break;p2=E.makeMove(p2,x);n++;}if(n!==c.line.length)why.push('line stops at ply '+n);}
     if(!(c.who&&c.who.length>=8))why.push('no who');if(!(c.why&&c.why.length>=40&&/\.$/.test(c.why)))why.push('no explanation');if(!(c.no>=1))why.push('no move number');
     if(why.length)bad.push(c.classic+': '+why.join(', '));}
   L.say(CL.length>0&&bad.length===0,'node TC-R233b every one of the '+CL.length+' rows is a legal move the gate reads as a sacrifice, once only, with a line that plays move by move, who played it, its move number and an explanation',bad.slice(0,5));}
  // ── node: the rules that read the line, pinned to games ──────────────────────────────────────────────────────────────────────────
  const op=byId('opera:16Qb8'),lt=byId('lasker-thomas:11Qxh7'),re=byId('reti:9Qd8'),bg=byId('polish-immortal:13Bg1'),im=byId('immortal:19e5'),ph=byId('philidor-legacy:1Qg8'),cap=byId('capablanca:29Qb2'),gc=byId('gold-coins:22Rxh3');
  L.say([op,lt,re,bg,im,ph,cap,gc].every(Boolean),'node TC-R233c PRECONDITION the eight named rows are in the table (Opera 16.Qb8+, Lasker v Thomas 11.Qxh7+, Reti 9.Qd8+, Najdorf 13...Bg1, the Immortal 19.e5, Philidor\'s legacy, Capablanca 29...Qb2, Marshall 22...Rxh3)');
  L.say(has(op,'deflection','high')&&has(op,'back-rank','high')&&has(op,'queen-sac','high'),'node TC-R233c DEFLECTION: the Opera Game\'s 16.Qb8+ pulls the knight off the d-file - deflection, a back-rank mate and a queen sacrifice',op&&tagsOf(op).t.tags);
  L.say(has(cap,'deflection','high')&&has(cap,'back-rank','high'),'node TC-R233c DEFLECTION: Capablanca\'s 29...Qb2 (Qxb2 Rd1 mate) is a deflection and a back-rank mate',cap&&tagsOf(cap).t.tags);
  L.say(!!gc&&!has(gc,'deflection')&&!has(gc,'attraction')&&!has(gc,'king-hunt'),'node TC-R233c and Marshall\'s 22...Rxh3 (a fork follows, nothing is pulled away) is none of deflection, drawing the king out or king hunt',gc&&tagsOf(gc).t.tags);
  L.say(has(re,'attraction','high')&&!has(re,'king-hunt'),'node TC-R233d DRAWING THE KING OUT: Reti\'s 9.Qd8+ (the king itself takes) is one; two king moves are not a king hunt',re&&tagsOf(re).t.tags);
  L.say(has(lt,'king-hunt','high')&&has(lt,'attraction','high')&&has(lt,'mating-attack','high')&&!has(lt,'back-rank'),'node TC-R233d KING HUNT: Lasker v Thomas 11.Qxh7+ drives the king from g8 to g1 - a king hunt and a mating attack, and the king mated on the FAR rank is not a back-rank mate',lt&&tagsOf(lt).t.tags);
  L.say(has(bg,'clearance','high'),'node TC-R233e CLEARANCE: Najdorf\'s 13...Bg1 leaves h2 for the queen, which lands there next move',bg&&tagsOf(bg).t.tags);
  L.say(has(im,'interference'),'node TC-R233e INTERFERENCE: the Immortal Game\'s 19.e5 lands between the queen on b2 and the pawn on g7',im&&tagsOf(im).t.tags);
  L.say(has(ph,'smothered-mate','high')&&!has(ph,'interference'),'node TC-R233e and Philidor\'s legacy is a smothered mate, with no interference read between a rook and its own king',ph&&tagsOf(ph).t.tags);
  {// POSITIONAL: a rook for a guarded bishop, and four quiet plies later White is still the exchange down. The same position with a check in the line is not one.
   const P={fen:'r5k1/5ppp/8/8/1p1N4/2b5/P4PPP/2R3K1 w - - 0 1',uci:'c1c3'};
   const quiet=tagsOf(Object.assign({line:['bxc3','Nb3','Kf8','Kf1']},P)).t,chk=tagsOf(Object.assign({line:['bxc3','Nc6','Kf8','Ne5','Ra1#']},P)).t,short=tagsOf(Object.assign({line:['bxc3','Nb3']},P)).t;
   const hs=(t,x)=>t.tags.some(y=>y.tag===x);
   L.say(hs(quiet,'exchange-sac')&&hs(quiet,'positional-sac'),'node TC-R233f POSITIONAL SACRIFICE: a rook for a guarded bishop, four quiet plies on and still the exchange down',quiet.tags);
   L.say(!hs(short,'positional-sac')&&!hs(chk,'positional-sac'),'node TC-R233f and not on a line of two plies, nor on a line that ends in mate',{short:short.tags,chk:chk.tags});}
  {const leak=CL.filter(c=>tagsOf(c,true).t.tags.some(x=>LINE_TAGS.indexOf(x.tag)>=0)).map(c=>c.classic);
   const moved=GG.map(c=>E.brilKind(c)).join(',');
   L.say(CL.length>0&&leak.length===0&&moved==='greek-gift,greek-gift','node TC-R233g WITH NO LINE nothing changes: none of the six line kinds is read on any of the '+CL.length+' rows when the line is withheld, and his own cards (no line stored) read as before ('+moved+')',leak.slice(0,5));}
  const spread={};CL.forEach(c=>E.brilKinds(c).forEach(k=>{spread[k]=(spread[k]||0)+1;}));
  const kindsN=Object.keys(spread).length;
  L.note('168: the famous-games shelf by kind: '+Object.keys(spread).map(k=>k+' '+spread[k]).join(', '));
  L.say(kindsN>=8&&['king-hunt','attraction','deflection','clearance','greek-gift','queen-sac','exchange-sac','smothered-mate'].every(k=>spread[k]>=1),'node TC-R233g the shelf spans '+kindsN+' kinds, the eight named ones among them (king hunt, drawing the king out, deflection, clearance, Greek gift, queen sacrifice, exchange sacrifice, smothered mate)',spread);
  const khDeck=CL.filter(c=>E.brilKinds(c).indexOf('king-hunt')>=0),smDeck=CL.filter(c=>E.brilKinds(c).indexOf('smothered-mate')>=0);
  // ── the screen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const WORDS=/^From famous games · \d+$/i;
  const sheet=(b)=>b.page.evaluate((src)=>{const W=new RegExp(src,'i');const s=document.querySelector('[data-ct="bril-lib"]');
    const painted=(x)=>{const q=x.getBoundingClientRect();return q.width>0&&q.height>0;};
    const head=[...document.querySelectorAll('body *')].filter(x=>x.children.length===0&&painted(x)&&W.test((x.innerText||'').trim()));
    const cover=[...document.querySelectorAll('body *')].filter(x=>x.children.length===0&&painted(x)&&/^You have played \d+ brilliant moves? of \d+ kinds?\./.test((x.innerText||'').trim()));
    const sc=document.querySelector('[data-ct="bril-lib-scroll"]');const go=document.querySelector('[data-ct="bril-lib-go"]');
    const R=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();return {t:r.top,b:r.bottom,l:r.left,r:r.right,h:r.height,w:r.width};};
    const chips=[...document.querySelectorAll('[data-ct="bril-ckind"]')].map(e=>Object.assign({k:e.getAttribute('data-k'),nw:e.getAttribute('data-new')==='1',on:e.getAttribute('aria-pressed')==='true',tx:(e.innerText||'').replace(/\s+/g,' ').trim(),grp:(e.closest('[data-ct="bril-classics-new"]')?'new':e.closest('[data-ct="bril-classics-played"]')?'played':'?')},R(e)));
    return {lib:!!s,head:head.map(x=>(x.innerText||'').trim()),cover:cover.map(x=>(x.innerText||'').trim()),chips,go:go?(go.innerText||'').trim():null,goR:R(go),scR:R(sc),
      sc:sc?{top:sc.scrollTop,sh:sc.scrollHeight,ch:sc.clientHeight,oy:getComputedStyle(sc).overflowY}:null,own:[...document.querySelectorAll('[data-ct="bril-kind"]')].map(e=>e.getAttribute('data-k')),vw:innerWidth,vh:innerHeight};},WORDS.source);
  const chip=async(b,k)=>{const el=b.page.locator('[data-ct="bril-ckind"][data-k="'+k+'"], [data-ct="bril-kind"][data-k="'+k+'"]').first();await el.scrollIntoViewIfNeeded({timeout:3000}).catch(()=>{});await el.click({timeout:3000}).catch(()=>{});await b.settle(250);};
  const openLib=async(b)=>{let ok=true;try{await b.tile('Review');await b.settle(800);await b.page.locator('[data-ct="bril-tile"]').click({timeout:4000});await b.settle(700);}catch(e){ok=false;}return ok;};
  const drill=(b)=>b.page.evaluate(()=>{const c=document.querySelector('[data-ct="drill-counter"]');const top=document.querySelector('[data-ct="pz-top"]');const msg=document.querySelector('[data-ct="pz-msg"]');
    const painted=(x)=>{const q=x.getBoundingClientRect();return q.width>0&&q.height>0;};
    return {lib:!!document.querySelector('[data-ct="bril-lib"]'),libW:[...document.querySelectorAll('body *')].filter(x=>painted(x)&&/^Brilliant moves by kind$/.test((x.innerText||'').trim())).length,
      counter:c?(c.innerText||'').replace(/\s+/g,' ').trim():null,cut:c?(c.scrollWidth-c.clientWidth):null,cR:c?(()=>{const r=c.getBoundingClientRect();return {l:r.left,r:r.right};})():null,
      top:top?(top.innerText||'').replace(/\s+/g,' ').trim():null,topR:top?(()=>{const r=top.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom};})():null,msg:msg?(msg.innerText||'').replace(/\s+/g,' ').trim():null,vw:innerWidth,vh:innerHeight};});
  const stored=(b)=>b.page.evaluate(()=>{try{const a=JSON.parse(localStorage.getItem('ct_mybrilliancies')||'[]');return {n:a.length,who:a.filter(x=>x&&(x.who||x.classic)).length};}catch(e){return null;}});
  for(const geo of GEOS){
    // 1. the one-kind player opens the library, reads the shelf, scrolls it, chooses a kind he has never played, and solves its first card
    {const b=await L.launch({geo,name:'bril-famous-'+geo,store:{ct_mybrilliancies:GG,ct_bril_reset_v1:'1',ct_pool:'3'}});await b.open();
     const ok=await openLib(b);const s0=await sheet(b);
     L.say(ok&&!!s0&&s0.lib&&s0.head.length===1,geo+' TC-R233h the one-kind player\'s tile opens the library, and it carries the famous-games shelf, found by its words ('+JSON.stringify(s0&&s0.head)+')',s0&&{lib:s0.lib,head:s0.head,own:s0.own});
     const nNew=s0?s0.chips.filter(c=>c.nw).length:0;const wantNew=Object.keys(spread).filter(k=>k!=='greek-gift').length;
     L.say(!!s0&&(s0.head[0]||'').toUpperCase()===('From famous games · '+CL.length).toUpperCase(),geo+' TC-R233h the shelf says how many moves it holds: '+CL.length+' ("'+(s0&&s0.head[0])+'")');
     L.say(!!s0&&s0.cover.length===1&&s0.cover[0]==='You have played 2 brilliant moves of 1 kind. '+wantNew+' more kinds from famous games are new to you.'&&nNew===wantNew&&wantNew>=7,geo+' TC-R233i the coverage line counts what he has played and what is new to him ("'+(s0&&s0.cover[0])+'"; '+nNew+' chips marked new)');
     const got={};(s0?s0.chips:[]).forEach(c=>{got[c.k.replace('classic|','')]=c.tx;});
     const cmp=Object.keys(spread).filter(k=>got[k]!==(E.BRIL_KIND_NAME[k]+' '+spread[k]));
     L.say(!!s0&&s0.chips.length===kindsN&&s0.chips.length>0&&cmp.length===0,geo+' TC-R233j every kind on the shelf is a chip with its count ('+(s0&&s0.chips.map(c=>c.tx).join(' | '))+')',cmp);
     const named=['King hunt','Drawing the king out','Deflection','Clearance','Smothered mate'].filter(n=>!(s0&&s0.chips.some(c=>c.tx.indexOf(n+' ')===0&&c.nw&&c.grp==='new')));
     const gg=s0&&s0.chips.find(c=>c.k==='classic|greek-gift');const lastNew=s0?Math.max(...s0.chips.filter(c=>c.nw).map(c=>c.b),-1):-1;
     L.say(named.length===0&&!!gg&&!gg.nw&&gg.grp==='played'&&gg.tx==='Greek gift '+spread['greek-gift']&&s0.chips.filter(c=>!c.nw).length===1&&gg.b>lastNew,geo+' TC-R233j the kinds he has not played come first and say so (King hunt, Drawing the king out, Deflection, Clearance, Smothered mate among them); the Greek gift, which he has played, comes after them under "Kinds you have played"',{missing:named,gg});
     L.say(!!s0&&s0.chips.length>0&&s0.chips.every(c=>c.h>=43.5&&c.l>=0&&c.r<=s0.vw+0.5),geo+' TC-R233k every famous-games chip is 44px tall and inside the screen\'s width ('+(s0&&Math.min(...s0.chips.map(c=>Math.round(c.h))))+'px the shortest)');
     // the Practice button: on screen before any scroll, and still on screen with the shelf scrolled to its end; the last chip is brought on screen by ACTUALLY scrolling the sheet's own scroller
     const goOn=(s)=>!!s&&!!s.goR&&s.goR.h>=43.5&&s.goR.t>=0&&s.goR.b<=s.vh+0.5&&s.goR.l>=0&&s.goR.r<=s.vw+0.5&&!!s.scR&&s.goR.t>=s.scR.b-0.5;
     L.say(goOn(s0),geo+' TC-R233k the Practice button is on screen under the shelves before any scroll ('+(s0&&s0.goR&&Math.round(s0.goR.t)+'-'+Math.round(s0.goR.b))+' of '+(s0&&s0.vh)+')',s0&&{goR:s0.goR,scR:s0.scR});
     await b.page.evaluate(()=>{const sc=document.querySelector('[data-ct="bril-lib-scroll"]');if(sc)sc.scrollTop=sc.scrollHeight;});await b.settle(350);
     const s1=await sheet(b);const g1=s1&&s1.chips.find(c=>c.k==='classic|greek-gift');
     const scrolls=!!s0&&!!s0.sc&&s0.sc.sh>s0.sc.ch+1;
     if(scrolls)L.say(!!s1&&/auto|scroll/.test(s1.sc.oy)&&s1.sc.top>0&&!!g1&&g1.t>=s1.scR.t-0.5&&g1.b<=s1.scR.b+0.5&&goOn(s1),geo+' TC-R233k the shelf is longer than the sheet ('+s0.sc.sh+' in '+s0.sc.ch+'): scrolled by '+(s1&&s1.sc.top)+'px its last chip is inside the scroller, and the Practice button has not moved off screen',s1&&{sc:s1.sc,g1,goR:s1.goR});
     else L.say(!!s1&&!!g1&&g1.t>=s1.scR.t-0.5&&g1.b<=s1.scR.b+0.5&&goOn(s1),geo+' TC-R233k the whole shelf fits the sheet with no scroll: its last chip is inside it and the Practice button is on screen',s1&&{sc:s1.sc,g1,goR:s1.goR});
     // the chooser is one chooser: three kinds across his shelf and the famous one, the fourth refused
     for(const k of ['played|greek-gift','classic|king-hunt','classic|deflection','classic|clearance'])await chip(b,k);
     const s2=await sheet(b);const on2=s2?[...s2.chips.filter(c=>c.on).map(c=>c.k)]:[];
     L.say(!!s2&&on2.join(',')==='classic|king-hunt,classic|deflection'&&!on2.includes('classic|clearance'),geo+' TC-R233l one chooser over all the shelves: with his Greek gift, King hunt and Deflection chosen the fourth (Clearance) is refused ('+on2.join(', ')+')',s2&&{on2,go:s2.go});
     await chip(b,'played|greek-gift');await chip(b,'classic|deflection');
     const s3=await sheet(b);
     L.say(khDeck.length>=2&&!!s3&&s3.go==='Practice these '+khDeck.length,geo+' TC-R233l with King hunt alone chosen the button counts that deck ("'+(s3&&s3.go)+'", '+khDeck.length+' cards)');
     await b.page.locator('[data-ct="bril-lib-go"]').click({timeout:3000}).catch(()=>{});await b.settle(1500);
     const d=await drill(b);const bd0=await b.board();
     L.say(!!d&&!d.lib&&d.libW===0&&d.counter==='✨ Famous games · 1 of '+khDeck.length+' ▾',geo+' TC-R233m the drill opens on that deck, the library gone, and its header reads Famous games and the count, nothing else ("'+(d&&d.counter)+'")',d);
     L.say(!!d&&d.cut!==null&&d.cut<=0.5&&!!d.cR&&d.cR.l>=0&&d.cR.r<=d.vw+0.5,geo+' TC-R233m the header and its counter are whole, not cut ('+(d&&d.cut)+'px over)',d&&{cut:d.cut,cR:d.cR});
     // WHERE the name is: in the goal on a phone at least 740 tall (the brilliant drill reserves the goal's three lines there, so the board holds its
     // place); on a shorter phone the goal stays the one line his own cards have and the name opens the explanation once the card is solved.
     const TALL=!!d&&d.vh>=740;
     if(TALL)L.say(/White to move\. Edward Lasker v Thomas, London 1912\. Find the brilliant move\./.test(d.top||'')&&!!d.topR&&d.topR.l>=-0.5&&d.topR.r<=d.vw+0.5,geo+' TC-R233m the card names whose move it was, in its goal: Edward Lasker v Thomas, London 1912 ("'+(d&&(d.top||'').slice(-90))+'")');
     else L.say(!!d&&/🎯 White to move$/.test(d.top||''),geo+' TC-R233m on a phone under 740 tall the goal is the one line his own cards have ("'+(d&&(d.top||'').slice(-40))+'"), so the board keeps its size; the name is checked in the explanation below');
     let solved=true;try{await b.move('h5','h7',0);await b.settle(2500);}catch(e){solved=false;}
     const d2=await drill(b);const bd1=await b.board();
     L.say(solved&&!!d2&&/The queen is given up to drag the king out\./.test(d2.msg||'')&&/Kd2 is mate/.test(d2.msg||'')&&(TALL||/Edward Lasker v Thomas, London 1912\. The queen/.test(d2.msg||'')),geo+' TC-R233m the queen from h5 to h7 solves it, and the explanation written for it shows'+(TALL?'':', opening with whose move it was')+' ("'+(d2&&(d2.msg||'').slice(0,70))+'...")',d2&&d2.msg);
     L.say(!!bd0&&!!bd1&&Math.abs(bd1.y-bd0.y)<0.5&&Math.abs(bd1.w-bd0.w)<0.5&&bd0.x>=-0.5&&bd0.x+bd0.w<=(d?d.vw:0)+0.5,geo+' TC-R233m the board did not move when the card was solved, and it is inside the screen',{bd0,bd1});
     const st=await stored(b);
     L.say(!!st&&st.n===2&&st.who===0,geo+' TC-R233m the famous moves are not his: his stored list still holds his two cards and none of theirs',st);
     L.say(b.errs.length===0,geo+' TC-R233m zero app errors',b.errs.slice(0,3));
     await b.close();}
    // 2. a deck of his own cards and famous ones together; a famous move he already holds as his own is not offered twice; the switch
    {const gr=byId('greco:7Bxh7');const MINE=[card('FT01'),{fen:gr.fen,uci:gr.uci,label:'Brilliant',ts:1791000000000,last:null,why:'You give up the bishop here, and it holds.',no:7}];
     const b=await L.launch({geo,name:'bril-famous-mix-'+geo,store:{ct_mybrilliancies:MINE,ct_bril_reset_v1:'1',ct_pool:'3'}});await b.open();
     const ok=await openLib(b);const s0=await sheet(b);const g0=s0&&s0.chips.find(c=>c.k==='classic|greek-gift');
     L.say(ok&&!!s0&&(s0.head[0]||'').toUpperCase()===('From famous games · '+(CL.length-1)).toUpperCase()&&!!g0&&g0.tx==='Greek gift '+(spread['greek-gift']-1),geo+' TC-R233l a famous move he already holds as his own card is not offered twice: the shelf holds '+(CL.length-1)+' and its Greek gifts are one fewer ("'+(s0&&s0.head[0])+'", "'+(g0&&g0.tx)+'")');
     await chip(b,'played|greek-gift');await chip(b,'classic|smothered-mate');const s1=await sheet(b);
     L.say(smDeck.length===1&&!!s1&&s1.go==='Practice these 3',geo+' TC-R233l his kind and a famous kind are practised together: his two Greek gifts and the one smothered mate ("'+(s1&&s1.go)+'")');
     await b.page.locator('[data-ct="bril-lib-go"]').click({timeout:3000}).catch(()=>{});await b.settle(1500);
     const d0=await drill(b);const mb0=await b.board();
     await b.page.locator('[data-ct="drill-counter"]').click({timeout:3000}).catch(()=>{});await b.settle(400);
     await b.page.locator('[data-ct="drill-pick-n"]').nth(2).click({timeout:3000}).catch(()=>{});await b.settle(1200);
     const d1=await drill(b);const mb1=await b.board();
     L.say(!!d0&&/Your brilliant moves · 1 of 3/.test(d0.counter||'')&&/🎯 White to move$/.test(d0.top||'')&&!!d1&&/Famous games · 3 of 3/.test(d1.counter||'')&&(d1.vh>=740?/Philidor's legacy/.test(d1.top||''):/🎯 White to move$/.test(d1.top||'')),geo+' TC-R233m in one deck his cards read as his and the famous card as theirs (card 1 "'+(d0&&d0.counter)+'", card 3 "'+(d1&&d1.counter)+'")',{d0:d0&&d0.top,d1:d1&&d1.top});
     L.say(!!mb0&&!!mb1&&Math.abs(mb1.y-mb0.y)<0.5&&Math.abs(mb1.w-mb0.w)<0.5,geo+' TC-R233m the board is the same size in the same place on his card and on the famous card (y '+(mb0&&mb0.y)+' and '+(mb1&&mb1.y)+', width '+(mb0&&mb0.w)+' and '+(mb1&&mb1.w)+')',{mb0,mb1});
     L.say(b.errs.length===0,geo+' TC-R233m zero app errors (the mixed deck)',b.errs.slice(0,3));
     await b.close();}
    {const b=await L.launch({geo,name:'bril-famous-off-'+geo,store:{ct_mybrilliancies:GG,ct_bril_reset_v1:'1',ct_pool:'3',ct_bril_lib:'0'}});await b.open();
     await b.tile('Review').catch(()=>{});await b.settle(800);await b.page.locator('[data-ct="bril-tile"]').click({timeout:4000}).catch(()=>{});await b.settle(1500);
     const s=await sheet(b);const d=await drill(b);
     L.say(!!s&&!s.lib&&s.head.length===0&&s.chips.length===0&&!!d&&/Your brilliant moves · 1 of 2/.test(d.counter||''),geo+' TC-R233l with the library switched off (ct_bril_lib 0) there is no famous-games shelf (by its words: '+(s&&s.head.length)+') and the tile starts the drill on his two cards ("'+(d&&d.counter)+'")');
     await b.close();}
  }
},'168-brilliant-famous-games');
// SELECTOR-OPENED: bril-ckind reading=presence the chips are also counted against the shelf's own words and pinned by name (TC-R233j)
// SELECTOR-OPENED: bril-lib-scroll reading=presence its overflow and scroll range are read, and the last chip's place after a real scroll (TC-R233k)
// SELECTOR-OPENED: bril-lib-go reading=presence the button's words and place (TC-R233k, TC-R233l)
// SELECTOR-OPENED: bril-classics-new reading=fallback a chip in neither group reads '?', which fails TC-R233j
// SELECTOR-OPENED: bril-classics-played reading=fallback as above
// SELECTOR-OPENED: drill-counter reading=presence TC-R233m needs the counter's words
// SELECTOR-OPENED: drill-pick-n reading=presence TC-R233m (the mixed deck) needs card 3 reached; if the chooser is missing the counter does not read 3 of 3
// SELECTOR-OPENED: pz-top reading=presence TC-R233m reads the card's words
// SELECTOR-OPENED: pz-msg reading=presence TC-R233m reads the explanation
// SELECTOR-OPENED: bril-tile reading=presence the tile is tapped; if it is missing TC-R233h is red
