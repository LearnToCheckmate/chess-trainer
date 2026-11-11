'use strict';
// gates/regress/116-brilliant-rule-3.js - BRILLIANT RULE 3, ON BY DEFAULT WITH ITS SWITCH. US-R127 / TC-R194a..k.
//
// WHY [#550 item (17), jobs/one-brilliant-rule-with-its-sentence-replaces-twelve-items-2026-11-03]: Kunal's answers -
// questions/B9C-BRIL-RULE2 "on" (on now, then trim: miss none, few extras), questions/B10-SHIP-ON "on" (a new feature ships on with
// its switch in Settings), and in chat on docs/brilliant-rule-3-design-2026-11-10 (about 11:40pm EST Tue 10 Nov 2026): "at least
// we're not missing anything that chess.com does". Rule 3 is that design at its recommended dial: rule 2's two arms with NO needed
// test, plus clauses A (never an Inaccuracy), B (a piece saved is not a piece offered), C (the third time a piece is left is stale),
// D (nothing given while answering a check), E (a piece already lost must be clearly the best move) and K (a counter-capture under
// a forking check).
// WHAT IT READS. Blocks A-H are NODE blocks over chess.jsx through gates/engine-extract.js (the bundle is minified and cannot be
// extracted, as gate 68 says), so their control is CT_SRC=<a mutated chess.jsx>. Every clause is asserted on BOTH sides: the position
// rule 2 calls Brilliant and rule 3 does not (or the reverse, for K), so a clause deleted from rule 3 turns its line red. Block F is the
// thirteen chess.com Brilliants of gates/brilliant-fixed-tests.json (the app engine's own numbers), every one still Brilliant under
// rule 3. Block Z is a BROWSER block over the bundle under test (CT_APP): the menu's New features switch, found by its label.
// ── CONTROL-RECORD lines. Node controls are CT_SRC (chess.jsx with one clause removed); the bundle control is a CT_APP trial bundle.
const L=require('../lib');
const E=require('../engine-extract.js');
console.log('116-brilliant-rule-3: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5+' (blocks A-H); bundle '+(process.env.CT_APP||'app.js')+' (block Z)');
const sq=s=>[8-parseInt(s[1],10),'abcdefgh'.indexOf(s[0])];
const mv=(pos,from,to)=>{const [fr,fc]=sq(from),[tr,tc]=sq(to);return E.getLegal(pos).find(m=>m.fr===fr&&m.fc===fc&&m.tr===tr&&m.tc===tc&&!m.promo);};
const G=(fen,from,to,loss,evA,evB,evN,rule,ext)=>{const pos=E.fromFEN(fen),pl=mv(pos,from,to);return {pos,pl,g:pl?E.brilliantGate(pos,pl,loss,evA,evB,evN,rule,ext):null};};
const pick=g=>g&&{ok:g.ok,arm:g.arm,gT:g.gT,gSq:g.gSq,sac:g.sac,lossWin:g.lossWin,gapWin:g.gapWin,originPre:g.originPre,hangAge:g.hangAge,chk:g.chk};

L.run(async()=>{
  // ── H. THE DEFAULT AND ITS NUMBER ────────────────────────────────────────────────────────────────────────────────────────────
  L.say(E.BRIL_RULE_DEFAULT===3&&E.BRIL_RULE===3,'TC-R194a H1 rule 3 is the default (BRIL_RULE_DEFAULT '+E.BRIL_RULE_DEFAULT+', BRIL_RULE with no key '+E.BRIL_RULE+')');
  L.say(E.BRIL_A===E.CLS_BANDS[2][0]&&E.BRIL_A===8.2096,'TC-R194a H2 clause A\'s number is the top of the Good band, 8.2096 (CLS_BANDS[2][0] '+E.CLS_BANDS[2][0]+')');

  // ── A. NEVER AN INACCURACY: lossWin < 8.2096 ─────────────────────────────────────────────────────────────────────────────────
  // The bishop on c4 left to the b5 pawn (gate 82's HANG). Loss 200 with the mover +3 after: under the 220 cap, so rule 2 calls it
  // Brilliant; in win percent it costs winPct(500)-winPct(300), about 11.2, an Inaccuracy, so rule 3 does not.
  const HANG='6k1/8/8/1p6/2B5/8/r7/6K1 w - - 0 1';
  {const a2=G(HANG,'g1','f1',200,3.0,5.0,null,2).g,a3=G(HANG,'g1','f1',200,3.0,5.0,null,3).g,a0=G(HANG,'g1','f1',0,3.0,3.0,null,3).g;
   L.say(!!a2&&a2.ok===true,'TC-R194b A0 PRECONDITION rule 2 calls 1.Kf1 Brilliant at loss 200, +3 after (the 220 cap)',pick(a2));
   L.say(!!a3&&a3.ok===false&&a3.lossWin>=8.2096,'TC-R194b A1 rule 3 does not: it costs '+(a3&&a3.lossWin)+' points of win chance, an Inaccuracy',pick(a3));
   L.say(!!a0&&a0.ok===true&&a0.lossWin===0,'TC-R194b A2 the same move at loss 0 IS Brilliant under rule 3 (lossWin '+(a0&&a0.lossWin)+')',pick(a0));
   const ax=G(HANG,'g1','f1',200,3.0,5.0,null,3,{lossWin:4.0}).g;
   L.say(!!ax&&ax.ok===true&&ax.lossWin===4,'TC-R194b A3 a lossWin handed in by the review (sfGradePly\'s _wd) is the one read: 4.0 passes',pick(ax));}

  // ── B. A PIECE SAVED IS NOT A PIECE OFFERED (originPre) ──────────────────────────────────────────────────────────────────────
  // Knight d4 attacked by the e5 pawn and bishop c4 by the b5 pawn: 1.Nf3 saves the knight and leaves the bishop, which was lost anyway.
  {const B='7k/8/8/1p2p3/2BN4/8/8/6K1 w - - 0 1';   // Kh8: on g8 the c4 bishop would already be giving check
   const b2=G(B,'d4','f3',0,0.5,0.5,0.5,2).g,b3=G(B,'d4','f3',0,0.5,0.5,0.5,3).g;
   L.say(!!b2&&b2.ok===true&&b2.arm==='hang'&&b2.gSq==='c4','TC-R194c B0 PRECONDITION rule 2 calls 1.Nf3 a bishop sacrifice on c4 (Brilliant)',pick(b2));
   L.say(!!b3&&b3.originPre===3&&b3.ok===false,'TC-R194c B1 rule 3: the knight could already be won for 3 where it stood (originPre '+(b3&&b3.originPre)+'), so the bishop is not offered: not Brilliant',pick(b3));}

  // ── C. THE THIRD TIME IS STALE (hangAge) ─────────────────────────────────────────────────────────────────────────────────────
  // Bishop c4 left to the b5 pawn while both kings shuffle: White's 1st move (ply 0), 2nd (ply 2) and 3rd (ply 4) all leave it.
  {let p=E.fromFEN('7k/8/8/1p6/2B5/8/8/6K1 w - - 0 1');const P=[p];
   for(const [f,t] of [['g1','h1'],['h8','h7'],['h1','g1'],['h7','h8'],['g1','h1']]){p=E.makeMove(p,mv(p,f,t));P.push(p);}
   const at=(i,f,t)=>E.brilliantGate(P[i],mv(P[i],f,t),0,0.5,0.5,0.5,3,{positions:P,i});
   const c0=at(0,'g1','h1'),c2=at(2,'h1','g1'),c4=at(4,'g1','h1');
   L.say(c0.ok===true&&c0.hangAge===1,'TC-R194d C1 the first move that leaves the bishop: age 1, Brilliant',pick(c0));
   L.say(c2.ok===true&&c2.hangAge===2,'TC-R194d C2 the second consecutive move: age 2, still Brilliant (as 7...Nf6 and 21.g3)',pick(c2));
   L.say(c4.ok===false&&c4.hangAge===3,'TC-R194d C3 the third: age 3, stale, NOT Brilliant (as 8...Nd4 and 22.b5)',pick(c4));
   const c4n=E.brilliantGate(P[4],mv(P[4],'g1','h1'),0,0.5,0.5,0.5,3);
   L.say(c4n.ok===true&&c4n.hangAge===1,'TC-R194d C4 the same position with no history (a single FEN) reads age 1',pick(c4n));}

  // ── D. NOTHING GIVEN WHILE ANSWERING A CHECK (the landing arm too) ──────────────────────────────────────────────────────────
  // Bb4 checks Ke1; 1.Nc3 blocks on a square the d4 pawn takes. Rule 2 counts the landing arm in check; rule 3 does not.
  {const D='4k3/8/8/8/1b1p4/8/8/1N2K3 w - - 0 1';
   const d2=G(D,'b1','c3',0,0.5,0.5,0.5,2).g,d3=G(D,'b1','c3',0,0.5,0.5,0.5,3).g;
   L.say(!!d2&&E.isInCheck(E.fromFEN(D).board,'w')&&d2.ok===true&&d2.arm==='land','TC-R194e D0 PRECONDITION White is in check and rule 2 calls the block 1.Nc3 a knight sacrifice',pick(d2));
   L.say(!!d3&&d3.ok===false&&d3.sac===0,'TC-R194e D1 rule 3: a piece given while answering check is not a sacrifice (sac '+(d3&&d3.sac)+')',pick(d3));}

  // ── E. A PIECE ALREADY LOST MUST BE CLEARLY THE BEST MOVE (gapWin) ──────────────────────────────────────────────────────────
  // Knight d4, attacked by the e5 pawn, takes c6 where the b7 pawn takes back (a desperado: sacLand 2). Only when every other move is
  // an Inaccuracy worse does it count.
  {const X='6k1/1p6/2p5/4p3/3N4/8/8/6K1 w - - 0 1';
   const e2=G(X,'d4','c6',0,0.5,0.5,0.5,2).g,e3=G(X,'d4','c6',0,0.5,0.5,0.5,3).g,e3b=G(X,'d4','c6',0,0.5,0.5,-2.0,3).g,e3n=G(X,'d4','c6',0,0.5,0.5,null,3).g;
   L.say(!!e2&&e2.ok===true&&e2.sacLand===2,'TC-R194f E0 PRECONDITION rule 2 calls the desperado 1.Nxc6 Brilliant (sacLand 2)',pick(e2));
   L.say(!!e3&&e3.ok===false&&e3.originPre===3&&e3.gapWin===0,'TC-R194f E1 rule 3: the knight was lost anyway (originPre 3) and the next best is as good (gap '+(e3&&e3.gapWin)+'): not Brilliant',pick(e3));
   L.say(!!e3b&&e3b.ok===true&&e3b.gapWin>=8.2096,'TC-R194f E2 the same move when the next best is -2.0 (gap '+(e3b&&e3b.gapWin)+'): clearly best, Brilliant (as 31...Bxf3+)',pick(e3b));
   L.say(!!e3n&&e3n.ok===true,'TC-R194f E3 no next best at all (the only move): Brilliant',pick(e3n));}

  // ── K. THE COUNTER-CAPTURE UNDER A FORKING CHECK (how 10.Kxf2 counts) ──────────────────────────────────────────────────────
  // Ne2 checks Kg1 and eyes the c1 rook; 1.Kxf2 takes the OTHER knight and leaves the rook to the checker.
  {const K='6k1/8/8/8/8/8/4nn2/2R3K1 w - - 0 1';
   const k2=G(K,'g1','f2',0,0.5,0.5,-3.0,2).g,k3=G(K,'g1','f2',0,0.5,0.5,-3.0,3).g,k3g=G(K,'g1','f2',0,0.5,0.5,0.4,3).g,k3b=G(K,'g1','f2',30,0.5,0.8,0.8,3,{playedIsBest:false}).g;
   L.say(!!k2&&k2.ok===false,'TC-R194g K0 PRECONDITION rule 2 has no arm for 1.Kxf2 (in check: no hanging arm; f2 is safe)',pick(k2));
   L.say(!!k3&&k3.ok===true&&k3.chk===5&&k3.gSq==='c1'&&k3.gT==='r','TC-R194g K1 rule 3: the rook on c1 is left to the CHECKING knight (chk '+(k3&&k3.chk)+'), the move is best and clearly so: Brilliant',pick(k3));
   L.say(!!k3g&&k3g.ok===false,'TC-R194g K2 not clearly best (next best +0.4, gap '+(k3g&&k3g.gapWin)+'): not Brilliant',pick(k3g));
   L.say(!!k3b&&k3b.ok===false,'TC-R194g K3 not the engine\'s first line: not Brilliant',pick(k3b));
   // Nf3 checks Kg1; 1.Kxg2 takes a pawn that is not the checker but leaves nothing the knight can win
   const kc=G('6k1/8/8/8/8/5n2/6p1/2R3K1 w - - 0 1','g1','g2',0,0.5,0.5,-3.0,3).g;
   L.say(!!kc&&kc.chk===0&&kc.ok===false,'TC-R194g K4 taking a piece that is not the checker but leaving nothing the checker can win: chk 0, not Brilliant',pick(kc));}

  // ── F. THE THIRTEEN CHESS.COM BRILLIANTS (the app engine's numbers), ALL STILL BRILLIANT ─────────────────────────────────────
  {const T=require('../brilliant-fixed-tests.json').tests;let n=0;
   for(const t of T){const pos=E.fromFEN(t.fen);const pl=E.getLegal(pos).find(m=>E.cleanSAN(E.toSAN(pos,m,E.applyMove(pos.board,m)))===E.cleanSAN(t.san));
     const g=pl?E.brilliantGate(pos,pl,t.loss,t.evA,t.evB,t.evN,3):null;if(g&&g.ok)n++;
     L.say(!!g&&g.ok===(t.want!==false),'TC-R194h '+t.id+' '+t.label+' ('+t.game+') is Brilliant under rule 3: '+(g&&g.arm)+' sac '+(g&&g.sac)+', lossWin '+(g&&g.lossWin),pick(g));}
   L.say(T.length===13&&n===13,'TC-R194h F-ALL 13 of 13 named chess.com Brilliants are Brilliant under rule 3 ('+n+' of '+T.length+')');}

  // ── G. THE REVIEW'S GRADER HANDS RULE 3 ITS INPUTS ───────────────────────────────────────────────────────────────────────────
  // sfGradePly over the clause-C game: ply 4's move is graded with the game's own positions (the third leave is stale) when the
  // caller passes them, and the review's _wd is the lossWin read.
  {let p=E.fromFEN('7k/8/8/1p6/2B5/8/8/6K1 w - - 0 1');const P=[p];
   for(const [f,t] of [['g1','h1'],['h8','h7'],['h1','g1'],['h7','h8'],['g1','h1']]){p=E.makeMove(p,mv(p,f,t));P.push(p);}
   const u=E.rc2sq(...sq('g1'))+'h1';
   const r4=E.sfGradePly(P[4],mv(P[4],'g1','h1'),50,50,40,u,null,null,3,false,{positions:P,i:4});
   const r2=E.sfGradePly(P[2],mv(P[2],'h1','g1'),50,50,40,'h1g1',null,null,3,false,{positions:P,i:2});
   L.say(r2&&r2.cls&&r2.cls.label==='Brilliant','TC-R194i G1 the review grader, second leave: Brilliant ('+(r2&&r2.cls&&r2.cls.label)+')',r2&&r2.gate&&pick(r2.gate));
   L.say(r4&&r4.cls&&r4.cls.label!=='Brilliant'&&r4.gate&&r4.gate.hangAge===3,'TC-R194i G2 the review grader, third leave: stale, not Brilliant ('+(r4&&r4.cls&&r4.cls.label)+', age '+(r4&&r4.gate&&r4.gate.hangAge)+')',r4&&r4.gate&&pick(r4.gate));}

  // ── Z. THE SWITCH ON THE MENU (bundle under test) ───────────────────────────────────────────────────────────────────────────
  if(!process.env.CT_SRC){
   const b=await L.launch({geo:'kunal761',name:'bril-rule-switch',store:{}});await b.open();
   const MD=require('../drive/menu');
   const row=async()=>{await MD.states['menu-bottom'](b);await b.settle(400);return b.page.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(e=>/^Brilliant moves/.test((e.innerText||'').trim()));if(!x)return null;x.scrollIntoView({block:'center'});const r=x.getBoundingClientRect();return {t:(x.innerText||'').replace(/\s+/g,' ').trim(),x:r.left+r.width/2,y:r.top+r.height/2,h:r.height,key:localStorage.getItem('ct_bril_rule')};});};
   let r0=null,r1=null,r2=null;try{r0=await row();}catch(e){}
   L.say(!!r0&&/ON$/.test(r0.t)&&r0.key===null,'TC-R194k Z1 on a fresh store the New features section shows the Brilliant rule ON (no key stored: the default)',r0);
   if(r0){await b.page.mouse.click(r0.x,r0.y);await b.page.waitForLoadState('domcontentloaded').catch(()=>{});await b.settle(1500);try{r1=await row();}catch(e){}}
   L.say(!!r1&&/OFF$/.test(r1.t)&&r1.key==='1','TC-R194k Z2 a tap turns it OFF: ct_bril_rule is written 1 (the old rule) and, after the reload, the row reads OFF',r1);
   if(r1){await b.page.mouse.click(r1.x,r1.y);await b.page.waitForLoadState('domcontentloaded').catch(()=>{});await b.settle(1500);try{r2=await row();}catch(e){}}
   L.say(!!r2&&/ON$/.test(r2.t)&&r2.key==='3','TC-R194k Z3 a second tap turns it back ON (written 3)',r2);
   L.say(b.errs.length===0,'TC-R194k Z4 zero app errors',b.errs.slice(0,3));
   await b.close();}
},'116-brilliant-rule-3');
