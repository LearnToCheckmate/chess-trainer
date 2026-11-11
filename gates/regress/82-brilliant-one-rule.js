// gates/regress/82-brilliant-one-rule.js
// US-R105 / TC-R122..TC-R130. #549 item (28), jobs/one-brilliant-rule-with-its-sentence-replaces-twelve-items-2026-11-03.
//
// THE RULE UNDER TEST (chess.jsx brilliantGate, the one place every brilliant in the app is decided): a move is Brilliant when
//   1 SOUND        loss < cap (220 when the sacrifice leaves the mover at least +1.2, else 90; kept exactly),
//   2 A SACRIFICE  sac >= 2, on the landing square OR on any other square holding one of the mover's pieces (the HANGING arm;
//                  only when the mover was not in check),
//   3 NOT BAD AFTER the mover's eval after the move >= BRIL_FLOOR (-1.0),
//   4 NEEDED       the next best move would not have left the mover at or above BRIL_NEEDED (+7.0) - Kunal, 4 Nov 2026.
// and the old evBefore window (> -1.0, < 4.5) and evAfter >= 0.8 floor are GONE.
//
// WHAT IT READS. Blocks A-G are NODE blocks over chess.jsx through gates/engine-extract.js (as gate 68: the bundle is minified and
// cannot be extracted, so a CT_APP trial bundle cannot redden these; their control is CT_SRC=<pre-fix chess.jsx>). Block F reads
// gates/brilliant-fixed-tests.json: the thirteen chess.com Brilliants the job names, each with the numbers THE APP'S OWN ENGINE
// gave the gate (stockfish-18-lite-single, depth 16, MultiPV 2, measured by gates/measure-brilliant-one-rule.js), so the verdict
// asserted is the gate's on the app engine's inputs. Block H is a BROWSER block over the bundle under test (CT_APP): the
// 'Grading changed' sheet on a stored review graded by an older build, its Update and its Not now.
// ── CONTROL-RECORD lines for gates/control-audit.js. Node controls are CT_SRC (a mutated copy of chess.jsx; the bundle is minified and
// cannot be extracted, as gate 68 says); bundle controls are CT_APP trial bundles built from chess.jsx with one change.
// CONTROL-RECORD: 3720349 2026-11-06 total=79 red=24 scope=env:CT_SRC=nc1-nohang how=hanging arm disabled (if(false&&hs>sac)) - A2 A3 B1 B3 B4 B6 C1 C3-C7 E1 FT06 FT07 FT08 FT10 FT11 G1 H1 H2 H9 Z2 red
// CONTROL-RECORD: 3720349 2026-11-06 total=79 red=2 scope=env:CT_SRC=nc2-noneeded how=needed forced true - B2 and B5 red
// CONTROL-RECORD: 3720349 2026-11-06 total=79 red=2 scope=env:CT_SRC=nc3-frame how=brilCardWhy reads evalAfter in White's frame - E6 and E8 red
// CONTROL-RECORD: 3720349 2026-11-06 total=79 red=1 scope=env:CT_SRC=nc4-checkhang how=hanging scan runs when the mover is in check - A6 red
// CONTROL-RECORD: 3720349 2026-11-06 total=79 red=25 scope=env:CT_SRC=nc5-oldfloor how=rule 2 keeps the old evAfter>=0.8 floor and evBefore window - C1 C3-C6 FT01 FT03-FT06 FT08 FT11-FT13 G1 H1 H2 H9 Z2 and more red
// CONTROL-RECORD: 3720349 2026-11-06 total=79 red=2 scope=trial:20f9b6fd7e42 how=regradeAnswer applies the changes on Not now - H13 red at kunal761 and se
// CONTROL-RECORD: 3720349 2026-11-06 total=79 red=16 scope=trial:ea84253b6902 how=no sheet, the regrade applied silently on arrival - H4-H7 H9 H10 H12 H13 red at both geometries
// CONTROL-RECORD: ad34c09 2026-11-11 total=80 red=3 scope=trial:ae73915f78b8 how=#550 item (17): CT_SRC with BRIL_RULE_DEFAULT back to 1 and the bundle before rule 3 (t64) - Z1, Z2 and H0b red; every other line green
// CONTROL-RECORD: c33e447 2026-11-11 total=80 red=3 scope=trial:1ddf30c42dc4 how=#550 item (20): a mutant whose ct_grades2 switch is ignored (GRADES2 always true, t78) - H0 and both H9 lines red (GRADE_VER 11 and 12 where the rule's own 1 and 2 are expected)
'use strict';
const path=require('path'),fs=require('fs');
const L=require('../lib');
const E=require('../engine-extract.js');
console.log('82-brilliant-one-rule: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5+' (blocks A-G); bundle '+(process.env.CT_APP||'app.js')+' (block H)');

const sq=s=>[8-parseInt(s[1],10),'abcdefgh'.indexOf(s[0])];
const mv=(pos,from,to)=>{const [fr,fc]=sq(from),[tr,tc]=sq(to);return E.getLegal(pos).find(m=>m.fr===fr&&m.fc===fc&&m.tr===tr&&m.tc===tc&&!m.promo);};
const G=(fen,from,to,loss,evA,evB,evN)=>{const pos=E.fromFEN(fen),pl=mv(pos,from,to);return {pos,pl,g:pl?E.brilliantGate(pos,pl,loss,evA,evB,evN,2):null};};

L.run(async()=>{
  // ── A. THE HANGING ARM, AND ITS IN-CHECK EXCLUSION ──────────────────────────────────────────────────────────────────────────
  // White Kg1, Bc4 attacked by the b5 pawn, black rook on a2 (no check). 1.Kf1 lands on a safe square and LEAVES the bishop.
  const HANG='6k1/8/8/1p6/2B5/8/r7/6K1 w - - 0 1';
  {const {pl,g}=G(HANG,'g1','f1',0,0.5,0.5,0.5);
   L.say(!!pl&&!!g,'TC-R122 A0 PRECONDITION Kf1 is legal in '+HANG+' and the gate answers',g);
   L.say(g&&g.sacLand===0,'TC-R122 A1 the landing square f1 is safe, so the landing arm alone reads 0 (sacLand='+(g&&g.sacLand)+') - the old measure could not see this sacrifice',g&&{sacLand:g.sacLand});
   L.say(g&&g.arm==='hang'&&g.gT==='b'&&g.gSq==='c4'&&g.sac===3,'TC-R122 A2 the HANGING arm finds the bishop on c4: arm='+(g&&g.arm)+' piece='+(g&&g.gT)+' square='+(g&&g.gSq)+' sac='+(g&&g.sac),g&&{arm:g.arm,gT:g.gT,gSq:g.gSq,sac:g.sac});
   L.say(g&&g.ok===true,'TC-R122 A3 with loss 0, after +0.5, next best +0.5, it is Brilliant (ok='+(g&&g.ok)+')');}
  // The same position with the rook on a1 GIVING CHECK: 1.Kf2 answers the check and leaves the same bishop. Not a choice to leave it.
  {const {pos,pl,g}=G('6k1/8/8/1p6/2B5/8/8/r5K1 w - - 0 1','g1','f2',0,0.5,0.5,0.5);
   L.say(!!pl&&E.isInCheck(pos.board,'w'),'TC-R123 A4 PRECONDITION White is in check before Kf2, and Kf2 is legal');
   L.say(g&&E.seeSq(E.makeMove(pos,pl),4,2,'b')===3,'TC-R123 A5 PRECONDITION the bishop on c4 IS winnable after Kf2 (seeSq 3), so only the exclusion can stop it');
   L.say(g&&g.isSac===false&&g.arm==='land'&&g.ok===false,'TC-R123 A6 a piece left while answering check is NOT a sacrifice: isSac='+(g&&g.isSac)+' arm='+(g&&g.arm)+' ok='+(g&&g.ok));}

  // ── B. NEEDED AT +7, BOTH SIDES OF THE EDGE AND BOTH COLOURS ───────────────────────────────────────────────────────────────
  {const a=G(HANG,'g1','f1',0,0.5,0.5,6.99).g,b=G(HANG,'g1','f1',0,0.5,0.5,7.0).g,n=G(HANG,'g1','f1',0,0.5,0.5,null).g;
   L.say(E.BRIL_NEEDED===7.0,'TC-R124 B0 the NEEDED number is +7.0, Kunal\'s answer (got '+E.BRIL_NEEDED+')');
   L.say(a.ok===true&&a.needed===true,'TC-R124 B1 White, next best +6.99: needed, Brilliant (ok='+a.ok+')');
   L.say(b.ok===false&&b.needed===false,'TC-R124 B2 White, next best +7.00: the next best already wins easily, NOT Brilliant (ok='+b.ok+' needed='+b.needed+')');
   L.say(n.ok===true&&n.needed===true,'TC-R124 B3 no next best at all (null: the only move): needed by definition (ok='+n.ok+')');}
  // Black to move, mirrored: Bc5 attacked by the b4 pawn, white rook on a7; 1...Kf8 leaves it. White-frame evals, so -7 is +7 for Black.
  {const BH='6k1/R7/8/2b5/1P6/8/8/6K1 b - - 0 1';
   const a=G(BH,'g8','f8',0,-0.5,-0.5,-6.99).g,b=G(BH,'g8','f8',0,-0.5,-0.5,-7.0).g,c=G(BH,'g8','f8',0,-0.5,-0.5,7.0).g;
   L.say(a&&a.arm==='hang'&&a.ok===true,'TC-R124 B4 Black, next best -6.99 (White frame): needed, Brilliant (arm='+(a&&a.arm)+' ok='+(a&&a.ok)+')');
   L.say(b&&b.ok===false&&b.needed===false,'TC-R124 B5 Black, next best -7.00: NOT Brilliant - the frame is the mover\'s (ok='+(b&&b.ok)+')');
   L.say(c&&c.ok===true,'TC-R124 B6 Black, next best +7.00 (good for WHITE): needed, Brilliant - a White-frame reading would have refused it (ok='+(c&&c.ok)+')');}

  // ── C. NOT BAD AFTER, AND THE TWO DROPPED CONDITIONS ───────────────────────────────────────────────────────────────────────
  {const f1=G(HANG,'g1','f1',0,-1.0,0.0,0.0).g,f2=G(HANG,'g1','f1',0,-1.01,0.0,0.0).g,lo=G(HANG,'g1','f1',0,0.31,0.0,0.0).g,hi=G(HANG,'g1','f1',0,4.0,5.0,4.0).g,neg=G(HANG,'g1','f1',0,0.0,-2.0,0.0).g;
   L.say(E.BRIL_FLOOR===-1.0&&f1.ok===true,'TC-R125 C1 after -1.00 for the mover: not bad after, Brilliant (floor '+E.BRIL_FLOOR+', ok='+f1.ok+')');
   L.say(f2.ok===false,'TC-R125 C2 after -1.01: bad after, NOT Brilliant (ok='+f2.ok+')');
   L.say(lo.ok===true,'TC-R125 C3 after +0.31 (18.Rxe4\'s chess.com reading): Brilliant - the old evAfter >= 0.8 floor is gone (ok='+lo.ok+')');
   L.say(hi.ok===true,'TC-R125 C4 before +5.0 (above the old 4.5 ceiling), next best +4.0: Brilliant - who was winning before does not gate it (ok='+hi.ok+')');
   L.say(neg.ok===true,'TC-R125 C5 before -2.0 (below the old -1.0 floor): Brilliant - decisions/brilliant-is-not-gated-by-who-is-winning-2026-09-23 (ok='+neg.ok+')');}
  // SOUND, the cap kept exactly
  {const c=(loss,evA)=>G(HANG,'g1','f1',loss,evA,0.0,0.0).g.ok;
   L.say(c(89,0.5)===true&&c(90,0.5)===false,'TC-R125 C6 the cap below +1.2 is 90: loss 89 Brilliant, loss 90 not ('+c(89,0.5)+','+c(90,0.5)+')');
   L.say(c(219,1.2)===true&&c(220,1.2)===false,'TC-R125 C7 the cap at +1.2 or better is 220: loss 219 Brilliant, loss 220 not ('+c(219,1.2)+','+c(220,1.2)+')');}

  // ── D. THE NEXT BEST, ONE DEFINITION FOR EVERY SITE ────────────────────────────────────────────────────────────────────────
  L.say(E.nextBestW(300,120,true)===120&&E.nextBestW(300,120,false)===300&&E.nextBestW(300,null,true)===null,'TC-R124 D1 nextBestW: the second line when the move was the engine\'s first, the first line when it was not, null when there is none');

  // ── E. THE SENTENCE ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  {const gh=G(HANG,'g1','f1',0,0.5,0.5,0.5).g;
   const rx=E.brilliantGate(E.fromFEN('r3r1k1/pppq2pp/4p3/3pB3/PP1Pn3/2PQ4/5PPP/R3R1K1 w - - 1 18'),mv(E.fromFEN('r3r1k1/pppq2pp/4p3/3pB3/PP1Pn3/2PQ4/5PPP/R3R1K1 w - - 1 18'),'e1','e4'),0,0.46,0.71,0.71,2);
   const qf=E.brilliantGate(E.fromFEN('5rk1/r6p/2p1p1p1/P3B3/1P1P4/2P4Q/5qPP/2R4K b - - 3 30'),mv(E.fromFEN('5rk1/r6p/2p1p1p1/P3B3/1P1P4/2P4Q/5qPP/2R4K b - - 3 30'),'f2','f1'),0,-99,-99,1.16,2);
   const t1=E.brilGiveTxt(gh,false),t2=E.brilGiveTxt(rx,false),t3=E.brilGiveTxt(qf,false),t4=E.brilGiveTxt({given:3,sac:3},false);
   L.say(t1==='You leave the bishop on c4 to be taken','TC-R126 E1 the hanging arm names the piece and its square: "'+t1+'"');
   L.say(t2==='You give up the rook for a knight','TC-R126 E2 18.Rxe4 names what was given AND what it took, where the old ladder said "a piece": "'+t2+'"');
   L.say(t3==='You give up the queen on f1','TC-R126 E3 30...Qf1+ names the queen and its square: "'+t3+'"');
   L.say(t4==='You give up a piece','TC-R126 E4 a gate stored before #549 (no piece type) falls back to the old ladder, not to nothing: "'+t4+'"');
   L.say(![t1,t2,t3,t4].some(t=>/trade/i.test(t)),'TC-R126 E5 none of the four calls the sacrifice a trade');
   // the practice card: the MOVER's frame, and a mate in words
   const wb=E.brilCardWhy({gate:rx,motifs:[],evalAfter:-2.5},'b'),wm=E.brilCardWhy({gate:qf,motifs:['check'],evalAfter:-99},'b'),ww=E.brilCardWhy({gate:rx,motifs:[],evalAfter:-2.5},'w');
   L.say(/\+2\.5 for you/.test(wb)&&!/-2\.5/.test(wb),'TC-R126 E6 a Black brilliancy at White-frame -2.5 reads "+2.5 for you" on the card: "'+wb+'"');
   L.say(/-2\.5 for you/.test(ww),'TC-R126 E7 the same number for a White mover reads -2.5 (the frame turns, it is not an absolute value): "'+ww+'"');
   L.say(/leads to mate/.test(wm)&&!/99/.test(wm),'TC-R126 E8 a mating line says mate in words, never "+99.0": "'+wm+'"');}

  // ── F. THE FORK, NAMED ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {const p=E.fromFEN('6k1/3q1p1p/8/8/4N3/8/6K1/8 w - - 0 1'),m=mv(p,'e4','f6');const ft=E.forkTargets(p,m),tx=E.forkTxt(ft);
   L.say(E.moveMotifs(p,m).includes('fork'),'TC-R126 F0 PRECONDITION Nf6+ is a fork by moveMotifs');
   L.say(tx==='It forks the king and the queen.','TC-R126 F1 the fork sentence names both targets: "'+tx+'"',ft);
   const q=E.fromFEN('6k1/8/8/8/4N3/8/6K1/8 w - - 0 1'),qm=mv(q,'e4','f6');
   L.say(E.forkTargets(q,qm).length===0,'TC-R126 F2 a lone check is not a fork: no targets');}

  // ── G. THE THIRTEEN FIXED TESTS, ON THE APP ENGINE'S NUMBERS ───────────────────────────────────────────────────────────────
  {const FX=JSON.parse(fs.readFileSync(path.join(__dirname,'..','brilliant-fixed-tests.json'),'utf8'));
   L.say(FX.tests&&FX.tests.length===13,'TC-R127 G0 DENOMINATOR the fixture holds the thirteen chess.com Brilliants the job names (got '+(FX.tests&&FX.tests.length)+')');
   let fires=0,old=0;
   for(const t of FX.tests){
     const pos=E.fromFEN(t.fen),pl=E.getLegal(pos).find(m=>E.toSAN(pos,m,E.applyMove(pos.board,m)).replace(/[+#]/g,'')===t.san.replace(/[+#]/g,''));
     if(!pl){L.say(false,'TC-R127 '+t.id+' '+t.san+' is not legal in its own position');continue;}
     const g=E.brilliantGate(pos,pl,t.loss,t.evA,t.evB,t.evN,2);
     if(g.ok)fires++;if(E.brilliantV1ok(g))old++;
     L.say(g.ok===t.want,'TC-R127 '+t.id+' '+t.game+' '+t.label+': '+(t.want?'Brilliant on the app engine':'NOT Brilliant, measured reason: '+t.reason)+' (ok='+g.ok+' loss='+g.loss+' sac='+g.sac+' arm='+g.arm+' after='+g.evAfter+' next='+g.evNext+')');
   }
   L.say(fires===FX.expectFires,'TC-R127 G1 the one rule takes '+fires+' of 13 (pinned '+FX.expectFires+')');
   L.say(old===FX.expectOld,'TC-R127 G2 the rule it replaced takes '+old+' of the same 13 on the same numbers (pinned '+FX.expectOld+') - the job\'s "today it takes 3 of the 11"');}

  // ── Z. THE SWITCH: THIS BUILD SHIPS THE RULE OFF, UNTIL KUNAL HAS SEEN WHAT IT ADDS ──────────────────────────────────────────
  // The job's close condition: "before it ships he sees every new Brilliant it fires across his reviewed games". So the default
  // is the rule it replaces, verdict for verdict. #550 item (17) turned rule 3 on (his B9C-BRIL-RULE2 "on"), so Z1-Z2 flip with it:
  // the default is rule 3, rule 1 is what the switch's OFF reads, and Z3 asks rule 1 by name.
  {const d=E.fromFEN(HANG),dp=mv(d,'g1','f1');const g0=E.brilliantGate(d,dp,0,0.5,0.5,0.5),g1=E.brilliantGate(d,dp,0,0.5,0.5,0.5,1),g2=E.brilliantGate(d,dp,0,0.5,0.5,0.5,2);
   L.say(E.BRIL_RULE_DEFAULT===3&&E.BRIL_RULE===3,'TC-R130 Z1 the app grades by rule 3 since #550 (BRIL_RULE_DEFAULT '+E.BRIL_RULE_DEFAULT+')');
   L.say(g0.rule===3&&g0.ok===true&&g0.arm==='hang'&&g1.rule===1&&g1.ok===false&&g1.arm==='land'&&g2.ok===true,'TC-R130 Z2 with no rule named the gate answers by rule 3 (Kf1 Brilliant on the hanging arm); rule 1, asked by name, does not use that arm, rule 2 does (ok '+g0.ok+' / '+g1.ok+' / '+g2.ok+')');
   let same=0,n=0;for(const t of JSON.parse(fs.readFileSync(path.join(__dirname,'..','brilliant-fixed-tests.json'),'utf8')).tests){const p=E.fromFEN(t.fen),m=E.getLegal(p).find(x=>E.toSAN(p,x,E.applyMove(p.board,x)).replace(/[+#]/g,'')===t.san.replace(/[+#]/g,''));if(!m)continue;n++;const g=E.brilliantGate(p,m,t.loss,t.evA,t.evB,t.evN,1);if(g.ok===E.brilliantV1ok(g))same++;}
   L.say(n===13&&same===13,'TC-R130 Z3 rule 1 is the old verdict exactly: on all '+n+' fixed tests brilliantGate (rule 1) agrees with brilliantV1ok ('+same+'/'+n+')');}

  // ── H. THE REGRADE PREVIEW, IN NODE AND THEN ON THE BUNDLE ─────────────────────────────────────────────────────────────────
  const FXR=JSON.parse(fs.readFileSync(path.join(__dirname,'..','brilliant-fixed-tests.json'),'utf8')).regrade;
  const res=E.loadSANs(E.parsePGN(FXR.pgn));
  const rg=E.regradeGame(res,FXR.cache,'w',2);
  const want=FXR.expectChanges;
  L.say(!!rg&&rg.changes.length===want.length&&want.every(w=>rg.changes.some(c=>c.no===w.no&&c.side===w.side&&c.san===w.san&&c.to===w.to)),'TC-R128 H1 regradeGame lists exactly the changed Brilliants of the cached 3 Nov game: '+(rg?rg.changes.map(c=>c.no+(c.side==='w'?'.':'...')+c.san+' '+c.from+'->'+c.to).join(', '):'null'),want);
  L.say(!!rg&&rg.delta.bril===want.filter(w=>w.to==='Brilliant').length-want.filter(w=>w.from==='Brilliant').length,'TC-R128 H2 the tally delta moves bril by the changes alone ('+(rg&&JSON.stringify(rg.delta))+')');
  L.say(E.regradeGame(res,null,'w')===null&&E.regradeGame(res,{evW:[0,1]},'w')===null,'TC-R128 H3 no cached engine output (or the wrong length): null, so the game is left for its next review and never estimated');
  // the same in the bundle: a stored review graded under GRADE_VER 1, its engine output in ct_evalcache under the app's own key
  const ckey=(sans)=>{let h=5381;const str=sans.join(' ')+'|sf18c';for(let i=0;i<str.length;i++){h=((h<<5)+h+str.charCodeAt(i))>>>0;}return 'g'+h.toString(36)+'-'+sans.length;};   // chess.jsx evalCacheKey, replicated: if it drifts H4 goes red, loudly
  const sans=res.plies.map(p=>p.san);
  const row={src:'cc',acct:'kunal2023',pgn:FXR.pgn,white:'Kunal2023',black:'WataGwaan76',wr:'win',tc:'blitz',date:1793640000000};
  const gk='cc:'+row.date+':Kunal2023:WataGwaan76';
  const stored={bril:1,great:20,inacc:3,mist:2,blun:1,obril:0,src:'review',engine:'sf',gv:1};
  const store=(gv)=>({ct_ccuser:'kunal2023',ct_accts:['cc:kunal2023'],ct_acctgames:{'cc:kunal2023':[row]},ct_pool:'3',ct_gamestats:{[gk]:{...stored,gv}},ct_evalcache:{[ckey(sans)]:{...FXR.cache,at:Date.now()}},ct_mybrilliancies:[],ct_bril_rule:'2',ct_grades2:'0'});   // #550 item (20): the grades switch off, so GRADE_VER is the rule's own (1, 2 or 3) and the H block reads the brilliant regrade alone
  const read=(b)=>b.page.evaluate(()=>{const s=document.querySelector('[data-ct="regrade-preview"]');let gs={},mb=[];try{gs=JSON.parse(localStorage.getItem('ct_gamestats')||'{}');}catch(e){}try{mb=JSON.parse(localStorage.getItem('ct_mybrilliancies')||'[]');}catch(e){}
    return {shown:!!s,text:s?s.innerText.replace(/\s+/g,' '):'',adds:[...document.querySelectorAll('[data-ct="regrade-add"]')].map(e=>e.innerText),drops:[...document.querySelectorAll('[data-ct="regrade-drop"]')].map(e=>e.innerText),gs,mb};});
  {const st=store(1);st.ct_bril_rule='1';const b=await L.launch({geo:'kunal761',name:'r105-off',store:st});await b.open();await b.tile('Review');await b.settle(1500);
   const r=await read(b);L.say(!r.shown&&r.gs[gk]&&r.gs[gk].gv===1&&r.gs[gk].bril===1,'kunal761: TC-R130 H0 with the rule OFF (ct_bril_rule 1, the switch at off) a review graded under version 1 opens NO sheet and is not touched');
   await b.close();}
  // #550 item (17): with NO key stored the app grades by rule 3 (GRADE_VER 3), so the same version-1 review IS graded again: the sheet opens
  {const st=store(1);delete st.ct_bril_rule;const b=await L.launch({geo:'kunal761',name:'r105-default3',store:st});await b.open();await b.tile('Review');await b.settle(1500);
   const r=await read(b);L.say(r.shown&&r.gs[gk]&&r.gs[gk].gv===1,'kunal761: TC-R130 H0b with no rule key (rule 3, the default since #550) the version-1 review opens the Grading changed sheet and is not touched before he answers ("'+r.text.slice(0,70)+'")',{shown:r.shown,gv:r.gs[gk]&&r.gs[gk].gv});
   await b.close();}
  for(const geo of ['kunal761','se']){
    {const b=await L.launch({geo,name:'r105-confirm-'+geo,store:store(1)});await b.open();await b.tile('Review');await b.settle(1500);
     const r=await read(b);
     L.say(r.shown,geo+': TC-R129 H4 a review graded by an older build opens the "Grading changed" sheet on the games list before anything changes',r.text.slice(0,160));
     L.say(r.gs[gk]&&r.gs[gk].gv===1&&r.gs[gk].bril===1,geo+': TC-R129 H5 while the sheet is up the stored tally is UNCHANGED (gv '+(r.gs[gk]&&r.gs[gk].gv)+', bril '+(r.gs[gk]&&r.gs[gk].bril)+')');
     L.say(r.adds.length===want.filter(w=>w.to==='Brilliant').length&&want.filter(w=>w.to==='Brilliant').every(w=>r.adds.some(a=>a.includes(w.no+(w.side==='w'?'. ':'... ')+w.san))),geo+': TC-R129 H6 the sheet lists every Brilliant that appears, by move: '+r.adds.join(' | '));
     const box=await b.page.evaluate(()=>{const s=document.querySelector('[data-ct="regrade-preview"]');if(!s)return null;const q=s.getBoundingClientRect();const c=document.querySelector('[data-ct="regrade-confirm"]').getBoundingClientRect();return {l:q.left,r:q.right,b:q.bottom,vw:innerWidth,vh:innerHeight,cb:c.bottom,ch:c.height};});
     L.say(!!box&&box.l>=0&&box.r<=box.vw+0.5&&box.cb<=box.vh+0.5&&box.ch>=44,geo+': TC-R129 H7 the sheet fits the screen and Update is on it at 44px or more',box);
     if(r.shown){await b.page.click('[data-ct="regrade-confirm"]');await b.settle(500);}   // guarded: a missing sheet goes red on H4 and the rest still runs
     const r2=await read(b);const nt=r2.gs[gk]||{};
     L.say(!r2.shown,geo+': TC-R129 H8 Update closes the sheet');
     L.say(nt.gv===2&&nt.bril===1+rg.delta.bril&&nt.great===20+rg.delta.great&&nt.src==='review',geo+': TC-R129 H9 Update restamps the tally gv 2 and moves bril '+stored.bril+' -> '+nt.bril+' by the listed changes (src '+nt.src+')',nt);
     L.say(want.filter(w=>w.to==='Brilliant').every(w=>r2.mb.some(x=>x.fen===w.fen)),geo+': TC-R129 H10 every new Brilliant joins the practice list with its sentence ('+r2.mb.length+' cards: '+r2.mb.map(x=>x.why).join(' / ').slice(0,200)+')');
     L.say(b.errs.length===0,geo+': TC-R129 H11 zero app errors',b.errs.slice(0,2));
     await b.close();}
    {const b=await L.launch({geo,name:'r105-later-'+geo,store:store(1)});await b.open();await b.tile('Review');await b.settle(1500);
     const r=await read(b);L.say(r.shown,geo+': TC-R130 H12 PRECONDITION the sheet is up');
     if(r.shown){await b.page.click('[data-ct="regrade-later"]');await b.settle(500);}
     const r2=await read(b);
     L.say(!r2.shown&&r2.gs[gk]&&r2.gs[gk].gv===1&&r2.gs[gk].bril===1&&r2.mb.length===0,geo+': TC-R130 H13 Not now keeps every stored verdict as it was (gv '+(r2.gs[gk]&&r2.gs[gk].gv)+', bril '+(r2.gs[gk]&&r2.gs[gk].bril)+', cards '+r2.mb.length+')');
     await b.close();}
    {const b=await L.launch({geo,name:'r105-current-'+geo,store:store(2)});await b.open();await b.tile('Review');await b.settle(1500);
     const r=await read(b);L.say(!r.shown&&r.gs[gk]&&r.gs[gk].bril===1,geo+': TC-R130 H14 a review already graded under this version opens NO sheet and is not touched');
     await b.close();}
  }
},'82-brilliant-one-rule');
