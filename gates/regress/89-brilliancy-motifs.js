// gates/regress/89-brilliancy-motifs.js
// US-R112 / TC-R169..TC-R173. #549 item (35), jobs/brilliancy-library-and-motif-coverage-2026-09-23, work items 1, 3 and 4.
//
// WHAT IT TESTS. chess.jsx brilMotifs, the motif tagger: which KIND of sacrifice a Brilliant move is, so the library Kunal asked
// for on 23 and 30 Sep 2026 can offer "two or three different kinds of brilliance" instead of seventeen bishop sacrifices.
// Block A is one fixture per tagger rule (the job's work item 4: "a case per motif rule, plus a negative control that a plain
// good move earns no tag"); block B the negatives; block C pins the measurement of work item 1 over his own recorded games
// (gates/fixtures/brilliancy-motif-sample.json, from the tracker's copy of his 196 chess.com games since 1 Sep 2026, graded by the
// app's engine at #549 item (28) - nothing is fetched), under rule 1 (what the app grades by) and rule 2 (the one rule, off).
// NODE ONLY: everything is read out of chess.jsx through gates/engine-extract.js (the bundle is minified and cannot be extracted,
// as gate 68 says), so a CT_APP trial bundle cannot redden it; its control is CT_SRC=<a mutated chess.jsx>.
// NOTHING ON SCREEN READS brilMotifs YET, so there is no bundle block: the shelf and the chooser wait on Kunal's word on block C.
'use strict';
const path=require('path');
const L=require('../lib');
const E=require('../engine-extract.js');
const M=require('../measure-brilliancy-motifs.js');
console.log('89-brilliancy-motifs: MEASURING chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5);

const sq=s=>[8-parseInt(s[1],10),'abcdefgh'.indexOf(s[0])];
function T(fen,from,to,o){o=o||{};const pos=E.fromFEN(fen),[fr,fc]=sq(from),[tr,tc]=sq(to);
  const pl=E.getLegal(pos).find(m=>m.fr===fr&&m.fc===fc&&m.tr===tr&&m.tc===tc&&(o.promo?m.promo===o.promo:!m.promo));
  if(!pl)return {pl:null,m:null};
  const g=E.brilliantGate(pos,pl,0,pos.turn==='w'?1:-1,pos.turn==='w'?0.5:-0.5,null,o.rule||1);
  return {pl,g,m:E.brilMotifs(pos,pl,g,o.line)};}
const has=(m,tag,conf)=>!!m&&m.tags.some(t=>t.tag===tag&&(!conf||t.conf===conf));
const desc=m=>m?m.primary+' ['+m.tags.map(t=>t.tag+':'+t.conf).join(' ')+'] piece='+m.piece:'(no move)';

// ── A. ONE FIXTURE PER RULE ────────────────────────────────────────────────────────────────────────────────────────────────
{const r=T('r1bq1rk1/pppn1ppp/4p3/3pP3/3P4/2PB1N2/PP3PPP/R1BQK2R w KQ - 0 1','d3','h7');
 L.say(!!r.pl&&r.g.isSac,'TC-R169 A0'+'  '+'PRECONDITION Bxh7+ is legal and the gate calls it a sacrifice (sac='+(r.g&&r.g.sac)+')');
 L.say(r.m&&r.m.primary==='greek-gift'&&has(r.m,'greek-gift','high'),'TC-R169 A1'+'  '+'Bxh7+ next to the king on g8 is a GREEK GIFT, high: '+desc(r.m));}
{const r=T('r1bq1rk1/pppn1pp1/4p2p/3p4/3P4/2PB1N2/PP2QPPP/R1B1K2R w KQ - 0 1','c1','h6');
 L.say(r.m&&r.m.primary==='greek-gift'&&has(r.m,'greek-gift','medium'),'TC-R169 A2'+'  '+'Bxh6, the pawn two squares from the king on g8, is the greek-gift FAMILY at medium (his Bxh6/Bxg6/Bxh3): '+desc(r.m));}
{const r=T('6k1/5ppp/8/4p3/5n2/8/6PP/5RK1 w - - 0 1','f1','f4');
 L.say(r.m&&r.m.primary==='exchange-sac'&&has(r.m,'exchange-sac','high'),'TC-R169 A3'+'  '+'Rxf4 exf4, a rook for a knight, is an EXCHANGE SACRIFICE: '+desc(r.m));}
{const LN=['Rxg8','Nf7#'],r=T('r6k/6pp/7N/8/2Q5/8/6PP/6K1 w - - 0 1','c4','g8',{line:LN});
 L.say(r.m&&r.m.primary==='queen-sac'&&has(r.m,'queen-sac','high'),'TC-R170 A4'+'  '+'Qg8+ Rxg8 Nf7#: a QUEEN SACRIFICE, high because the line ends in mate: '+desc(r.m));
 L.say(has(r.m,'smothered-mate','high')&&has(r.m,'mating-attack','high')&&!has(r.m,'back-rank'),'TC-R170 A5'+'  '+'the same line is a SMOTHERED MATE and a mating attack, and not back-rank (the knight mates a king boxed by its own men)');}
{const r=T('2r3k1/5ppp/8/1Q6/8/8/5PPP/4R1K1 w - - 0 1','b5','e8',{line:['Rxe8','Rxe8#']});
 L.say(has(r.m,'back-rank','high')&&has(r.m,'mating-attack')&&has(r.m,'queen-sac','high')&&!has(r.m,'smothered-mate'),'TC-R170 A6'+'  '+'Qe8+ Rxe8 Rxe8#: BACK-RANK mate on the eighth rank, a queen sacrifice, not smothered: '+desc(r.m));}
{const r=T('2r3k1/5ppp/8/1Q6/8/8/5PPP/4R1K1 w - - 0 1','b5','e8');
 L.say(r.m&&has(r.m,'queen-sac','medium')&&!has(r.m,'mating-attack')&&!has(r.m,'back-rank'),'TC-R170 A7'+'  '+'the same Qe8+ with NO line: a queen sacrifice at medium only, never a mating attack without a line to read: '+desc(r.m));}
{const r=T('k7/6P1/8/8/8/8/8/K7 w - - 0 1','g7','g8',{promo:'n'});
 L.say(!!r.pl&&r.pl.promo==='n','TC-R171 A8'+'  '+'PRECONDITION g8=N is legal and carries .promo n');
 L.say(r.m&&r.m.primary==='underpromotion','TC-R171 A9'+'  '+'g8=N is an UNDERPROMOTION: '+desc(r.m));}
{const r=T('k7/6P1/8/8/8/8/8/K7 w - - 0 1','g7','g8',{promo:'q'});
 L.say(r.m&&!has(r.m,'underpromotion'),'TC-R171 A10'+'  '+'g8=Q is NOT an underpromotion: '+desc(r.m));}
{const r=T('6k1/5ppp/4p3/8/8/2N5/5PPP/6K1 w - - 0 1','c3','d5');
 L.say(r.g&&r.g.arm==='land'&&r.m&&r.m.primary==='quiet-sac'&&has(r.m,'quiet-sac','high'),'TC-R171 A11'+'  '+'Nd5, a non-capture offered to the e6 pawn, is a QUIET SACRIFICE, high: '+desc(r.m));}
{const r=T('7k/8/8/1p6/2B5/8/r7/6K1 w - - 0 1','g1','f1',{rule:2});
 L.say(r.g&&r.g.arm==='hang'&&r.m&&r.m.piece==='b'&&has(r.m,'quiet-sac','medium'),'TC-R171 A12'+'  '+'Kf1 leaving the c4 bishop (rule 2\'s hanging arm) is a quiet sacrifice at MEDIUM, and the piece given is the bishop: '+desc(r.m));}
{const r=T('r2bk3/2p5/8/1N6/8/8/8/4K3 w - - 0 1','b5','c7');
 L.say(r.m&&r.m.primary==='fork'&&!has(r.m,'quiet-sac'),'TC-R172 A13'+'  '+'Nxc7+ forking the king and the a8 rook, a capture, is a FORK and not a quiet sacrifice: '+desc(r.m));}
{const r=T('4k3/8/8/2p5/4N3/8/8/4R1K1 w - - 0 1','e4','c5');
 L.say(r.m&&r.m.primary==='discovered-check'&&has(r.m,'discovered-check','high'),'TC-R172 A14'+'  '+'Nxc5+ uncovering the e1 rook is a DISCOVERED CHECK: '+desc(r.m));}

// ── B. NEGATIVES: a tag must be able to be absent ───────────────────────────────────────────────────────────────────────────
{const r=T('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','e2','e4');
 L.say(r.m&&r.m.tags.length===0&&r.m.primary==='sacrifice','TC-R172 B1'+'  '+'a plain good move (1.e4) earns NO tag, and the answer falls back to the plain word: '+desc(r.m));}
{const r=T('6k1/1p3ppp/p7/8/8/3B4/5PPP/6K1 w - - 0 1','d3','a6');
 L.say(r.m&&r.m.primary==='sacrifice'&&!has(r.m,'greek-gift'),'TC-R172 B2'+'  '+'Bxa6 bxa6, a bishop for a pawn FAR from the king on g8, is NOT a greek gift: '+desc(r.m));}
{const r=T('2r3k1/5ppp/8/1Q6/8/8/5PPP/4R1K1 w - - 0 1','b5','e8',{line:['Rxe8']});
 L.say(r.m&&!has(r.m,'mating-attack')&&!has(r.m,'back-rank'),'TC-R172 B3'+'  '+'a line that stops short of mate is NOT a mating attack: '+desc(r.m));}
{const r=T('2r3k1/5ppp/8/1Q6/8/8/5PPP/4R1K1 w - - 0 1','b5','e8',{line:['Rxe8','Qxe8#']});
 L.say(r.m&&!has(r.m,'mating-attack'),'TC-R172 B4'+'  '+'a line with a move that is not legal stops there and is NOT read as mate: '+desc(r.m));}
{const r=T('r1bq1rk1/pppn1ppp/4p3/3pP1N1/3P4/2PB4/PP3PPP/R1BQK2R w KQ - 0 1','d3','h7');
 L.say(r.g&&r.g.isSac===false&&r.m&&!has(r.m,'greek-gift'),'TC-R172 B5'+'  '+'Bxh7+ with the knight on g5 guarding h7 gives nothing away (isSac='+(r.g&&r.g.isSac)+'), so it is NOT a greek gift: '+desc(r.m));}

// ── C. WORK ITEM 1 ON HIS RECORDED GAMES: the spread before and after the gate fix ────────────────────────────────────────
{const fix=require(path.join(__dirname,'..','fixtures','brilliancy-motif-sample.json'));
 L.say(JSON.stringify(fix.rows.length)===JSON.stringify(164),'TC-R173 C0'+'  '+'the recorded sample holds the 164 moves Brilliant under either rule across his 196 games'+': got '+JSON.stringify(fix.rows.length)+' want '+JSON.stringify(164));
 let unresolved=0;const B=[];
 for(const r of fix.rows){const a=M.grade(r,1),b=M.grade(r,2);if(!a||!b){unresolved++;continue;}
   const kunal=(r.side==='w'?r.white:r.black).toLowerCase()==='kunal2023';
   for(const [rule,x] of [[1,a],[2,b]])if(x.g.ok)B.push({rule,kunal,r,m:E.brilMotifs(x.pos,x.pl,x.g)});}
 L.say(JSON.stringify(unresolved)===JSON.stringify(0),'TC-R173 C1'+'  '+'every recorded move is legal in its recorded position'+': got '+JSON.stringify(unresolved)+' want '+JSON.stringify(0));
 const h1=B.filter(x=>x.rule===1&&x.kunal),h2=B.filter(x=>x.rule===2&&x.kunal);
 L.say(h1.length>0&&h2.length>0,'TC-R173 C2'+'  '+'DENOMINATOR: his own brilliants exist under both rules (rule 1 '+h1.length+', rule 2 '+h2.length+')');
 const s1=M.spread(h1.map(x=>({m:x.m}))),s2=M.spread(h2.map(x=>({m:x.m})));
 L.say(JSON.stringify(h1.length)===JSON.stringify(20),'TC-R173 C3'+'  '+'rule 1 (what the app grades by): his own brilliants'+': got '+JSON.stringify(h1.length)+' want '+JSON.stringify(20));
 L.say(JSON.stringify((s1.top.find(([k])=>k==='greek-gift')||[0,0])[1])===JSON.stringify(9),'TC-R173 C4'+'  '+'rule 1: the greek-gift family among them (his "bishop sac on the pawn")'+': got '+JSON.stringify((s1.top.find(([k])=>k==='greek-gift')||[0,0])[1])+' want '+JSON.stringify(9));
 L.say(JSON.stringify(s1.motifs)===JSON.stringify(4),'TC-R173 C5'+'  '+'rule 1: primary motifs his brilliants span'+': got '+JSON.stringify(s1.motifs)+' want '+JSON.stringify(4));
 L.say(JSON.stringify(h2.length)===JSON.stringify(81),'TC-R173 C6'+'  '+'rule 2 (the one rule, off by default): his own brilliants'+': got '+JSON.stringify(h2.length)+' want '+JSON.stringify(81));
 L.say(JSON.stringify(s2.motifs)===JSON.stringify(6),'TC-R173 C7'+'  '+'rule 2: primary motifs'+': got '+JSON.stringify(s2.motifs)+' want '+JSON.stringify(6));
 L.say(JSON.stringify(s2.greekShare)===JSON.stringify(17),'TC-R173 C8'+'  '+'rule 2: greek-gift share, percent (45 under rule 1)'+': got '+JSON.stringify(s2.greekShare)+' want '+JSON.stringify(17));
 const named=['174086914134 5...Bxf2+','185887758904 6...Bxf2+','184024052818 19...Bxh3','184924183572 18.Bxh6','185951559686 16.Bxh6'];
 const got=named.filter(n=>h1.some(x=>(x.r.game+' '+x.r.no+(x.r.side==='w'?'.':'...')+x.r.san)===n&&x.m.primary==='greek-gift'));
 L.say(JSON.stringify(got.length)===JSON.stringify(named.length),'TC-R173 C9'+'  '+'his named bishop-on-the-king moves are each tagged greek-gift ('+got.join(', ')+')'+': got '+JSON.stringify(got.length)+' want '+JSON.stringify(named.length));
 console.log('     rule 1: '+s1.top.map(([k,v])=>k+' '+v).join(', ')+' | rule 2: '+s2.top.map(([k,v])=>k+' '+v).join(', '));}

L.done('89-brilliancy-motifs');
