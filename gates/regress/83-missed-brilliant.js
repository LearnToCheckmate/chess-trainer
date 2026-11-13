// gates/regress/83-missed-brilliant.js
// US-R106 / TC-R133..TC-R137. #549 item (29), jobs/show-where-a-brilliant-move-was-available-and-the-player-did-not-play-it-2026-10-11.
//
// THE FEATURE. Kunal, 11 Oct 2026: "if there was an opportunity to play a brilliant move and they didn't, might be good to be able to
// call that out too". His answer on questions/B9-MISSED-BRILLIANTS (5 Nov): "A marker, and Show me plays it". At a move of HIS where the
// engine's best move would itself have been graded Brilliant (chess.jsx missedBrilliant: the same brilliantGate and the same rule the
// app grades every played move by - loss 0, the position's own eval after and before, the engine's second line as the next best) and
// he played something else, the review's move line carries the chip '!! missed <move> >' (data-ct rev-missbril) in the slot rev-best
// would take, a tap plays that line on the board (rev-bestline), the move strip marks that move '(!!)' (strip-missbril), and the eval
// graph carries a hollow ring at it (eval-graph-missbril).
// SHIPPED SWITCHED OFF at #549; ON SINCE #550 item (18), with its switch on the New features section: his answers B10-SHIP-ON "on" and
// B9C-MISSED-BRIL "clear" - the review MARKS a miss only when the played move lost MISS_CLEAR (50 centipawns) or more against the
// Brilliant, and the brilliant-moves drill takes EVERY such position (W18). ct_missed_bril '0' turns it off, '1' on; each browser case
// below names both switches (ct_bril_rule '1' or '2' as the case was written for, since rule 3 is the app's default from #550).
//
// WHAT IT READS. Blocks A-D are NODE blocks over chess.jsx through gates/engine-extract.js (the bundle is minified and cannot be
// extracted, as gates 68 and 82 say), so their control is CT_SRC=<a mutated chess.jsx>. Block W is a BROWSER block over the bundle under
// test (CT_APP): the 3 Nov 2026 game of gate 82's regrade fixture (gates/brilliant-fixed-tests.json, its engine output as the app would
// have cached it), where 23.bxc6 walks past 23.Reb1 - a rook move that leaves the a6 bishop en prise, Brilliant under the one rule only.
// ── CONTROL-RECORD lines for gates/control-audit.js. Node controls are CT_SRC (a mutated copy of chess.jsx); bundle controls are CT_APP
// trial bundles built from chess.jsx with one change.
// CONTROL-RECORD: d8648e8 2026-11-06 total=52 red=5 scope=env:CT_SRC=nc1-rule1 how=missedBrilliant always grades by rule 1 - A1 A2 B3 C1 C5 red
// CONTROL-RECORD: d8648e8 2026-11-06 total=52 red=1 scope=env:CT_SRC=nc2-playedbril how=the mark made even when the played move is itself Brilliant - B2 red
// CONTROL-RECORD: d8648e8 2026-11-06 total=52 red=2 scope=env:CT_SRC=nc3-noneeded how=missedBrilliant drops the next best (needed test off) - A2 B4 red
// CONTROL-RECORD: d8648e8 2026-11-06 total=52 red=1 scope=env:CT_SRC=nc6-on how=MISSED_BRIL_DEFAULT true - D1 red
// CONTROL-RECORD: d8648e8 2026-11-06 total=52 red=1 scope=env:CT_SRC=nc7-alwaysask how=sfGradePly computes the mark whatever the caller asks - D2 red
// CONTROL-RECORD: d8648e8 2026-11-06 total=52 red=3 scope=trial:61e6d67052c0 how=both colours marked (userColor filter dropped) - W12 at kunal761, W16 at kunal761 and se red
// CONTROL-RECORD: d8648e8 2026-11-06 total=52 red=4 scope=trial:e26d552cc1ff how=rev-best kept beside the chip - W14 W15 red at kunal761 and se
// CONTROL-RECORD: d8648e8 2026-11-06 total=52 red=2 scope=trial:ce0dae0e722d how=the switch on by default - W9 and W13 red at kunal761
// CONTROL-RECORD: ad34c09 2026-11-11 total=53 red=2 scope=trial:09de6ae42b2c how=#550 item (18): CT_SRC with MISSED_BRIL_DEFAULT false and the rule-3 bundle without item (18) (t65) - D1 and TC-R195 W18 red; every other line green
'use strict';
const path=require('path'),fs=require('fs');
const L=require('../lib');
const E=require('../engine-extract.js');
console.log('83-missed-brilliant: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5+' (blocks A-D); bundle '+(process.env.CT_APP||'app.js')+' (block W)');

const sq=s=>[8-parseInt(s[1],10),'abcdefgh'.indexOf(s[0])];
const mv=(pos,from,to)=>{const [fr,fc]=sq(from),[tr,tc]=sq(to);return E.getLegal(pos).find(m=>m.fr===fr&&m.fc===fc&&m.tr===tr&&m.tc===tc&&!m.promo);};
// White Kg1, Bc4 attacked by the b5 pawn, black rook on a2 (no check): any KING move leaves the bishop (the hanging arm, rule 2);
// Bb3 saves it. Gate 82's HANG position, with the engine's best move set to Kf1.
const HANG='6k1/8/8/1p6/2B5/8/r7/6K1 w - - 0 1';
const ply=(from,to,ev2,rule,bu)=>{const pos=E.fromFEN(HANG),pl=mv(pos,from,to);return {pl,r:pl?E.sfGradePly(pos,pl,50,40,ev2,bu===undefined?'g1f1':bu,'c4b3',null,rule,true):null};};

L.run(async()=>{
  // ── A. A MISSED BRILLIANT IS THE BEST MOVE, GRADED BY THE SAME GATE AND RULE ─────────────────────────────────────────────────
  {const {pl,r}=ply('c4','b3',45,2);
   L.say(!!pl&&!!r&&r.cls.label!=='Brilliant','TC-R133 A0 PRECONDITION 1.Bb3 is legal and is not itself Brilliant (label '+(r&&r.cls.label)+')');
   L.say(!!r&&!!r.mbril&&/^Kf1\+?$/.test(r.mbril.san)&&r.mbril.gate.arm==='hang'&&r.mbril.gate.gSq==='c4','TC-R133 A1 rule 2: the engine\'s best 1.Kf1, which leaves the c4 bishop, is marked as the missed brilliant (mbril '+(r&&r.mbril?r.mbril.san+' '+r.mbril.gate.arm+' '+r.mbril.gate.gT+r.mbril.gate.gSq:'null')+')');
   const g=E.brilliantGate(E.fromFEN(HANG),mv(E.fromFEN(HANG),'g1','f1'),0,0.5,0.5,0.45,2);
   L.say(!!r&&!!r.mbril&&g.ok===true&&r.mbril.gate.ok===g.ok&&r.mbril.gate.sac===g.sac&&r.mbril.gate.evAfter===g.evAfter&&r.mbril.gate.evNext===g.evNext,'TC-R133 A2 the mark IS brilliantGate on the best move with loss 0, after = before = the position\'s eval, next = the second line: the same answer field for field',g);
   const r1=ply('c4','b3',45,1).r;
   L.say(!!r1&&r1.mbril===null,'TC-R133 A3 rule 1 (the app\'s default today) has no hanging arm, so the same position marks nothing: the mark follows the rule the app grades by (mbril '+(r1&&r1.mbril)+')');}
  // ── B. WHAT IS NOT A MISSED BRILLIANT ─────────────────────────────────────────────────────────────────────────────────────
  {const r=ply('g1','f1',45,2).r;
   L.say(!!r&&r.cls.label==='Brilliant'&&r.mbril===null,'TC-R134 B1 the player FOUND it: Kf1 played is Brilliant and nothing is missed (label '+(r&&r.cls.label)+', mbril '+(r&&r.mbril)+')');
   const h=ply('g1','h1',45,2).r;
   L.say(!!h&&h.cls.label==='Brilliant'&&h.mbril===null,'TC-R134 B2 a DIFFERENT brilliant played (Kh1 leaves the same bishop): it is labelled Brilliant and no second mark is made (label '+(h&&h.cls.label)+', mbril '+(h&&h.mbril)+')');
   const n7=ply('c4','b3',700,2).r,n6=ply('c4','b3',699,2).r;
   L.say(!!n6&&!!n6.mbril,'TC-R134 B3 next best +6.99: the best move was needed, so it is marked');
   L.say(!!n7&&n7.mbril===null,'TC-R134 B4 next best +7.00: the second line already wins easily, the best move was NOT needed, so nothing is marked (the NEEDED test, inherited)');
   const nb=ply('c4','b3',45,2,null).r;
   L.say(!!nb&&nb.mbril===null,'TC-R134 B5 no engine best move recorded: nothing is marked (mbril '+(nb&&nb.mbril)+')');}
  // ── C. A REAL GAME, THROUGH THE REVIEW'S OWN GRADER ON THE APP ENGINE'S CACHED OUTPUT ──────────────────────────────────────
  {const FXR=JSON.parse(fs.readFileSync(path.join(__dirname,'..','brilliant-fixed-tests.json'),'utf8')).regrade;
   const res=E.loadSANs(E.parsePGN(FXR.pgn)),c=FXR.cache;
   const list=(rule)=>{const o=[];for(let i=0;i<res.plies.length;i++){const r=E.sfGradePly(res.positions[i],res.plies[i].move,c.evW[i],c.evW[i+1],c.ev2W[i],c.bU[i],c.aU[i],null,rule,true);if(r.mbril)o.push((Math.floor(i/2)+1)+(i%2?'...':'.')+res.plies[i].san+'>'+r.mbril.san);}return o;};
   L.say(res.plies.length===69&&c.evW.length===70,'TC-R135 C0 DENOMINATOR the 3 Nov game and its cached engine output are all there (plies '+res.plies.length+', evals '+c.evW.length+')');
   const l2=list(2),l1=list(1);
   L.say(l2.length===1&&l2[0]==='23.bxc6>Reb1','TC-R135 C1 rule 2 marks exactly one missed brilliant in the game: '+(l2.join(', ')||'none'));
   L.say(l1.length===0,'TC-R135 C2 rule 1 marks none in the same game on the same numbers: '+(l1.join(', ')||'none'));}
  // A SECOND REAL GAME, where rule 1 (the app's default today) finds one: Kunal2023 (Black) v jthomas250, 173995307022, from
  // gates/missed-brilliant-fixture.json. Both sides are listed here (sfGradePly does not know who the player is; the screen does).
  const MB=JSON.parse(fs.readFileSync(path.join(__dirname,'..','missed-brilliant-fixture.json'),'utf8'));
  {const res=E.loadSANs(E.parsePGN(MB.pgn)),c=MB.cache;
   const list=(rule)=>{const o=[];for(let i=0;i<res.plies.length;i++){const r=E.sfGradePly(res.positions[i],res.plies[i].move,c.evW[i],c.evW[i+1],c.ev2W[i],c.bU[i],c.aU[i],null,rule,true);if(r.mbril)o.push((Math.floor(i/2)+1)+(i%2?'...':'.')+res.plies[i].san+'>'+r.mbril.san);}return o;};
   L.say(res.plies.length===104&&c.evW.length===105,'TC-R135 C3 DENOMINATOR the 173995307022 game and its cached engine output are all there (plies '+res.plies.length+', evals '+c.evW.length+')');
   const l1=list(1),l2=list(2);
   L.say(JSON.stringify(l1)===JSON.stringify(MB.expect.rule1),'TC-R135 C4 rule 1 marks exactly '+MB.expect.rule1.join(', ')+' (got '+(l1.join(', ')||'none')+')');
   L.say(JSON.stringify(l2)===JSON.stringify(MB.expect.rule2),'TC-R135 C5 rule 2 marks exactly '+MB.expect.rule2.join(', ')+' (got '+(l2.join(', ')||'none')+')');}
  // ── D. THE SWITCH ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  {const pos=E.fromFEN(HANG),pl=mv(pos,'c4','b3'),r=E.sfGradePly(pos,pl,50,40,45,'g1f1','c4b3',null,2);
   L.say(!!r&&r.mbril===null,'TC-R137 D2 a grader not asked for the mark (wantMiss absent, which is what the review passes while MISSED_BRIL is off) spends nothing on it and returns none, on the position A1 marks (mbril '+(r&&r.mbril)+')');}
  L.say(E.MISSED_BRIL_DEFAULT===true&&E.MISSED_BRIL===true&&E.MISS_CLEAR===50,'TC-R137 D1 the marker ships ON (#550 item 18, B10-SHIP-ON) and marks clear misses only, 50 centipawns or more (MISSED_BRIL_DEFAULT '+E.MISSED_BRIL_DEFAULT+', MISS_CLEAR '+E.MISS_CLEAR+')');

  // ── W. ON THE BUNDLE: THE CHIP, SHOW ME, THE RING, AND WHO GETS NONE ──────────────────────────────────────────────────────────
  const FXR=JSON.parse(fs.readFileSync(path.join(__dirname,'..','brilliant-fixed-tests.json'),'utf8')).regrade;
  const res=E.loadSANs(E.parsePGN(FXR.pgn));const sans=res.plies.map(p=>p.san);
  const ckey=(s)=>{let h=5381;const str=s.join(' ')+'|sf18c';for(let i=0;i<str.length;i++){h=((h<<5)+h+str.charCodeAt(i))>>>0;}return 'g'+h.toString(36)+'-'+s.length;};   // chess.jsx evalCacheKey, as gate 82 replicates it
  const store=(o)=>{const F=o.fx||FXR,opp=o.opp||'WataGwaan76',fs2=o.fx?E.loadSANs(E.parsePGN(F.pgn)).plies.map(p=>p.san):sans;
    const me=o.meBlack?{white:opp,black:'Kunal2023',wr:'loss'}:{white:'Kunal2023',black:opp,wr:'win'};
    const row={src:'cc',acct:'kunal2023',pgn:F.pgn,...me,tc:'blitz',date:1793640000000};
    const st={ct_ccuser:'kunal2023',ct_accts:['cc:kunal2023'],ct_acctgames:{'cc:kunal2023':[row]},ct_pool:'3',ct_evalcache:{[ckey(fs2)]:{...F.cache,at:Date.now()}},ct_mybrilliancies:[]};
    st.ct_bril_rule=o.rule2?'2':'1';st.ct_missed_bril=o.on?'1':'0';return st;};
  const TARGET=45;   // 23.bxc6 is ply index 44, shown at ply 45
  // #550 [jobs/an-assertion-keyed-to-a-selector-its-own-build-adds-cannot-control-2026-09-29]: the three marks are found by WHAT THEY ARE,
  // the hooks rev-missbril / eval-graph-missbril / strip-missbril (added in #549 with this gate) as a fallback only - the chip by its
  // label "A brilliant move was here: ...", the ring as the graph's hollow cyan circle, the strip mark by its painted "(!!)". Keyed on
  // the hooks alone, W9/W10/W12 ("nothing is marked") read PASS on any bundle that marked the move under another name - the #432 costume.
  const read=(b)=>b.page.evaluate(()=>{const q=s=>document.querySelector(s);
    const ch=[...document.querySelectorAll('button')].find(x=>/^A brilliant move was here: /.test(x.getAttribute('aria-label')||'')&&x.getBoundingClientRect().width>0)||q('[data-ct="rev-missbril"]'),ln=q('[data-ct="rev-move-line"]');
    const ringEls=new Set([...document.querySelectorAll('[data-ct="eval-graph-missbril"]'),...[...document.querySelectorAll('svg circle')].filter(c=>{const st=getComputedStyle(c);return /none|rgba\(0, 0, 0, 0\)/.test(st.fill)&&/rgb\(34, 211, 238\)/.test(st.stroke);})]);
    const stripEls=new Set([...document.querySelectorAll('[data-ct="strip-missbril"]'),...[...document.querySelectorAll('span')].filter(x=>x.children.length===0&&(x.textContent||'').trim()==='(!!)'&&x.getBoundingClientRect().width>0)]);
    const r=ch?ch.getBoundingClientRect():null,lr=ln?ln.getBoundingClientRect():null;
    return {line:ln?ln.innerText.replace(/\s+/g,' ').trim():'',chip:ch?{text:ch.innerText.replace(/\s+/g,' ').trim(),l:r.left,r:r.right,w:r.width,h:r.height,sw:ch.scrollWidth,cw:ch.clientWidth}:null,
      lineR:lr?lr.right:null,vw:innerWidth,best:!!q('[data-ct="rev-best"]'),playout:!!q('[data-ct="rev-playout"]'),graph:!!q('[data-ct="eval-graph"]'),
      rings:ringEls.size,strip:[...stripEls].map(e=>(e.parentElement.innerText||'').replace(/\s+/g,' ').trim()),bestline:q('[data-ct="rev-bestline"]')?q('[data-ct="rev-bestline"]').innerText.replace(/\s+/g,' ').trim():null};});
  const open=async(b)=>{await b.open();await b.tile('Review');await b.settle(1200);
    const row=b.page.locator('[data-ct="game-row"]').first();if(!(await row.count().catch(()=>0)))return false;
    await row.click({timeout:6000}).catch(()=>{});await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:120000}).catch(()=>{});await b.settle(500);
    await b.tapText(/^Start review/,{wait:900}).catch(()=>{});await b.settle(400);return true;};
  const goPly=async(b,n)=>{for(let k=0;k<80;k++){const t=await b.page.evaluate(()=>{const m=(document.querySelector('[data-ct="rev-move-line"]')||{}).innerText||'';const x=/(\d+)\/(\d+)/.exec(m);return x?+x[1]:null;});
      if(t===n)return true;if(t==null)return false;await b.page.locator(t<n?'[aria-label="Next move"]':'[aria-label="Previous move"]').first().click({timeout:4000}).catch(()=>{});await b.page.waitForTimeout(90);}return false;};
  for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'r106-on-'+geo,store:store({rule2:true,on:true})});
    const op=await open(b);const at=op&&await goPly(b,TARGET);await b.settle(700);
    L.say(op&&at,geo+': TC-R136 W0 PRECONDITION the game opens from the games list and the review reaches ply '+TARGET+' (23.bxc6)');
    const r=await read(b);
    L.say(!!r.chip&&/!!/.test(r.chip.text)&&/Reb1/.test(r.chip.text)&&/23\.\s*bxc6/.test(r.line),geo+': TC-R136 W1 at 23.bxc6 the move line marks the missed brilliant: "'+(r.chip&&r.chip.text)+'" in "'+r.line+'"');
    L.say(!!r.chip&&!r.best&&!r.playout&&!/Excellent/.test(r.line),geo+': TC-R136 W2 the chip takes the best/why slot (rev-best '+r.best+', rev-playout '+r.playout+') and the verdict pill keeps its icon and gives up its word ("'+r.line+'")');
    L.say(!!r.chip&&r.chip.r<=Math.min(r.lineR,r.vw)+0.5&&r.chip.l>=0&&r.chip.sw<=r.chip.cw+1&&r.chip.h>=20,geo+': TC-R136 W3 the chip sits inside the move line and the screen, its text not cut (right '+(r.chip&&r.chip.r.toFixed(1))+' line '+(r.lineR&&r.lineR.toFixed(1))+' vw '+r.vw+', scroll '+(r.chip&&r.chip.sw)+' client '+(r.chip&&r.chip.cw)+')',r.chip);
    L.say(r.strip.length===1&&/^bxc6.*\(!!\)$/.test(r.strip[0]),geo+': TC-R136 W4a the move strip marks the one missed brilliant on 23.bxc6 with (!!): '+JSON.stringify(r.strip));
    L.say(r.graph?r.rings===1:true,geo+': TC-R136 W4 the eval graph carries exactly one hollow ring for the one missed brilliant (graph '+r.graph+', rings '+r.rings+')');
    if(r.chip){await b.page.locator('button[aria-label^="A brilliant move was here: "],[data-ct="rev-missbril"]').first().click().catch(()=>{});await b.settle(2500);}
    const r2=await read(b);
    L.say(!!r2.bestline&&/^(best line )?23\.\s*Reb1\b/.test(r2.bestline),geo+': TC-R136 W5 Show me: a tap plays the brilliant line on the board and names it, starting with the brilliant move ("'+r2.bestline+'")');
    // the moves round it carry nothing: ply 44 is the opponent's 22nd move, ply 47 his 24th (not a missed brilliant on the cached numbers)
    for(const p of [44,47]){await goPly(b,p);await b.settle(400);const q=await read(b);L.say(!q.chip,geo+': TC-R136 W6 ply '+p+' carries no missed-brilliant chip ('+q.line+')');}
    L.say(b.errs.length===0,geo+': TC-R136 W7 zero app errors',b.errs.slice(0,2));
    // #550 item (18): the drill takes the missed Brilliant - the review wrote a card for 23.Reb1 (e1b1) marked missed, with what he played
    if(geo==='kunal761'){const mb=await b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_mybrilliancies')||'[]');}catch(e){return null;}});
      const c=(mb||[]).find(x=>x&&x.uci==='e1b1');
      L.say(!!c&&c.missed===true&&/bxc6/.test(c.played||'')&&typeof c.why==='string'&&c.why.length>10,geo+': TC-R195 W18 the brilliant-moves drill now holds the missed 23.Reb1 (missed '+(c&&c.missed)+', played '+(c&&c.played)+', why "'+(c&&String(c.why).slice(0,60))+'")',c);}
    await b.close();
  }
  {const b=await L.launch({geo:'kunal761',name:'r106-off',store:store({rule2:true,on:false})});
   const op=await open(b);const at=op&&await goPly(b,TARGET);await b.settle(700);const r=await read(b);
   L.say(op&&at&&/23\.\s*bxc6/.test(r.line),'kunal761: TC-R137 W8 PRECONDITION switch off: the review still reaches 23.bxc6 ("'+r.line+'")');
   L.say(!r.chip&&r.rings===0&&r.strip.length===0,'kunal761: TC-R137 W9 with the switch OFF (ct_missed_bril 0) nothing is marked: chip '+!!r.chip+', rings '+r.rings+', strip marks '+r.strip.length);
   await b.close();}
  {const b=await L.launch({geo:'kunal761',name:'r106-rule1',store:store({rule2:false,on:true})});
   const op=await open(b);const at=op&&await goPly(b,TARGET);await b.settle(700);const r=await read(b);
   L.say(op&&at&&!r.chip&&r.rings===0&&r.strip.length===0,'kunal761: TC-R137 W10 switch on, rule 1 (the app\'s grading today): Reb1 is not Brilliant under rule 1, so nothing is marked (chip '+!!r.chip+', rings '+r.rings+', strip marks '+r.strip.length+')');
   await b.close();}
  {const b=await L.launch({geo:'kunal761',name:'r106-opp',store:store({rule2:true,on:true,meBlack:true})});
   const op=await open(b);const at=op&&await goPly(b,TARGET);await b.settle(700);const r=await read(b);
   L.say(op&&at&&/23\.\s*bxc6/.test(r.line),'kunal761: TC-R137 W11 PRECONDITION the same game with him as BLACK reaches 23.bxc6');
   L.say(!r.chip&&r.rings===0&&r.strip.length===0,'kunal761: TC-R137 W12 23.bxc6 is the OPPONENT\'s move there, so it carries no mark: the marker is for his own moves (chip '+!!r.chip+', rings '+r.rings+', strip marks '+r.strip.length+')');
   await b.close();}
  // RULE 1, THE APP'S DEFAULT, AND THE SLOT: 173995307022 with him as Black. 24...Qg4 is a Miss, so with the switch OFF rev-best offers
  // Qxd6 at that ply (the precondition that makes 'takes the slot' a claim that can fail); with it ON the chip offers Qxd6 instead.
  // 46.Rf7+ is also a rule-1 missed brilliant in the node list (C4), and it is the OPPONENT's, so the strip must not mark it.
  {const P=48;   // 24...Qg4 is ply index 47
   const off=await L.launch({geo:'kunal761',name:'r106-r1-off',store:store({fx:MB,opp:'jthomas250',meBlack:true})});
   const op0=await open(off),at0=op0&&await goPly(off,P);await off.settle(700);const r0=await read(off);
   L.say(op0&&at0&&/24\S*\s*Qg4/.test(r0.line)&&r0.best&&!r0.chip,'kunal761: TC-R136 W13 PRECONDITION switch off, rule 1: at 24...Qg4 the move line offers rev-best and no chip ("'+r0.line+'")');
   await off.close();
   for(const geo of ['kunal761','se']){
     const b=await L.launch({geo,name:'r106-r1-on-'+geo,store:store({fx:MB,opp:'jthomas250',meBlack:true,on:true})});
     const op=await open(b),at=op&&await goPly(b,P);await b.settle(700);const r=await read(b);
     L.say(op&&at&&!!r.chip&&/Qxd6/.test(r.chip.text)&&!r.best&&!r.playout,geo+': TC-R136 W14 rule 1 (no ct_bril_rule), switch on: at 24...Qg4 the chip offers the missed Qxd6 IN PLACE OF rev-best ("'+r.line+'", rev-best '+r.best+')');
     L.say(!!r.chip&&r.chip.r<=Math.min(r.lineR,r.vw)+0.5&&r.chip.l>=0&&r.chip.sw<=r.chip.cw+1,geo+': TC-R136 W15 the chip fits its row and the screen with its text uncut beside a Miss pill (right '+(r.chip&&r.chip.r.toFixed(1))+', line '+(r.lineR&&r.lineR.toFixed(1))+', scroll '+(r.chip&&r.chip.sw)+'/'+(r.chip&&r.chip.cw)+')',r.chip);
     L.say(r.strip.length===1&&/^Qg4/.test(r.strip[0]),geo+': TC-R137 W16 the strip marks his 24...Qg4 only, not the opponent\'s 46.Rf7+ that the node list also finds: '+JSON.stringify(r.strip));
     L.say(b.errs.length===0,geo+': TC-R136 W17 zero app errors',b.errs.slice(0,2));
     await b.close();}}
},'83-missed-brilliant');
// CONTROL-RECORD: 509485f 2026-11-13 total=53 red=2 scope=trial:7ce8591c2f6c how=#550 #432 sweep (chip, ring and strip mark found by label, shape and '(!!)'): c3, the three missbril hooks renamed AND ct_missed_bril '0' ignored - TC-R137 W9 (switch off, nothing marked) and the W13 precondition red; the hook-keyed version (55ca2c7) is 36/17 with W9 GREEN; on t0 6c4245e05ecc 53/0
// SELECTOR-OPENED: rev-missbril control=509485f round 1: the chip found by its accessible name; c3 renamed the three hooks and ignored the switch, W9 red
// SELECTOR-OPENED: eval-graph-missbril control=509485f round 1: the ring found as the graph's hollow cyan circle; same c3 control
// SELECTOR-OPENED: strip-missbril control=509485f round 1: the strip mark found by its painted (!!); same c3 control
