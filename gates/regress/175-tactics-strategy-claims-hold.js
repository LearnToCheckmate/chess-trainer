'use strict';
// gates/regress/175-tactics-strategy-claims-hold.js - WHAT TACTICS AND STRATEGY SAY IS TRUE OF THE BOARD THEY SHOW. US-R172 / TC-R246a..d.
//
// WHY [batch 13, jobs/tactics-strategy-wrong-chess-and-messages-2026-11-12; the independent checker's GAP of 15 Nov 2026]: gate 129 asks
// the engine whether the stored moves are good, and nothing asked whether the WORDS are true. The checker found: (1) 213 of the 238 legal
// wrong moves of the 13 Tactics cards, and every tap that is no legal move, read the one fixed line "Not the key move. Try again.";
// (2) "Put rooks on open files" promised an invasion that lost to a back-rank mate; (3) "The bishop pair" showed two bishops on squares of
// ONE colour under "cover squares of both colors"; (4) "Rooks love the 7th rank" said the king was pinned to a back rank it could leave.
// Reading every card for this build found four more: the Fork hint put f6 "next to" a queen on d7; "Double check" asked for a double
// check and marked the other double check (Nd6+) wrong without saying why; "Discovered check" likewise for seven of its eight knight
// moves; and "Discovered attack" called a queen lost for nothing "a queen for a knight".
// WHAT IT READS: the bundle under test (CT_APP) in real Chromium at 375x761 with his insets and at 320x568. The card rows are read out of
// the bundle (as gate 129 does), every sentence it judges is read off the SCREEN and compared with the row, and the board is read off the
// screen square by square against the row's FEN. The rules are the app's own (gates/engine-extract.js: getLegal, makeMove, getStatus,
// toSAN); who attacks what is computed HERE (attackers(), below), so a claim about an attack is not the app agreeing with itself.
// WHAT IT ASSERTS, per geometry:
//  TC-R246a  every legal wrong move of every Tactics card is PLAYED, and the line it shows is never the bare fixed line; a line that names
//            a mate is a mate, a line that names a piece hung names a legal capture of that piece on that square; every other line is
//            "Not <the move>. <the card's own line>"; a tap that is no legal move says so with the same line; the line is wholly inside
//            its box (not cut); and after all of that the key move still solves the card and shows its explanation.
//  TC-R246b  each Tactics sentence that makes a chess claim (idea, hint, explanation, the card's wrong-try line) is checked against the
//            position: ONE predicate per claim, the sentence pinned by its own words, and "one move does X" counted over every legal move.
//  TC-R246c  each of the 18 Strategy cards' look line and text is checked against its position the same way.
//  TC-R246d  the screen shows the row's words and the row's board (occupancy of all 64 squares, and one picture per piece kind).
//  TC-R262   [batch 13, q23 "Longer, friendlier wrong try lines"] each card's line is the longer one (80+ characters, pinned by its words in
//            TC-R246b); while it shows the board, the card box and the button row do not move and the page does not scroll; on his phone it
//            is drawn at the box's own size, and on a short phone it may step down to fit, never below 11.5px.
//  TC-R246e  sideways at 568x320 (one launch, its own line prefix): the card's line on a wrong try moves neither the board nor the buttons.
// KNOW ITS LIMIT: a claim is checked where the board or a short forced line settles it. "A small but lasting edge" and "the invasion
// works" are engine questions and live in gate 129 (TC-R205d, e). General advice with no position claim ("avoid overextending") is not
// judged. Sideways is read for what moves (TC-R246e), not move by move; the desktop layout draws the same string in the same slot.
// CONTROLS (each a trial bundle). The first five were taken before TC-R246e was added, when the gate had 571 lines; with it the real tree,
// trial fdfae5b382ad, reads 575 pass 0 fail.
// CONTROL-RECORD: 01a124ac 2026-11-19 total=571 red=113 scope=trial:53b6466fd06e how=THE SUBJECT REMOVED: the tree before the change (a70b9c65, built as a trial) - at each size the bare fixed line on all 13 cards (TC-R246a, 13 lines) and their no-legal-move taps, the wrong-try sentence absent from all 13 (TC-R246b), the four sentences since reworded (Fork hint, Discovered check idea, Double check idea, Discovered attack explanation), the open-file invasion (Rc7 allows mate), the bishops on one colour, and the two 7th-rank sentences
// CONTROL-RECORD: 01a124ac 2026-11-19 total=571 red=60 scope=trial:ee9d298a4c9e how=batch 13 pair break fixed-line-back (gates/pairs/breaks/tactics-wrong-try-fixed-line-back.diff): tacWrongLine returns nothing where wrongWhy has no reason - 30 TC-R246a lines red at each size (the bare line on every card, the tap that is no legal move, and no line to measure where every move was bare)
// CONTROL-RECORD: 01a124ac 2026-11-19 total=571 red=2 scope=trial:49d8234e5779 how=batch 13 pair break open-file-no-luft (gates/pairs/breaks/strategy-open-file-no-luft.diff): the open-file card back on the board without h3 - the one TC-R246c line 'Owning it lets a rook invade deep into the enemy camp' red at each size
// CONTROL-RECORD: 01a124ac 2026-11-19 total=571 red=26 scope=trial:bd06f038e570 how=batch 13 pair break line-cut-on-a-short-phone (gates/pairs/breaks/tactics-wrong-try-line-cut-on-a-short-phone.diff): the line is not scrolled to the top of its box - 26 TC-R246a lines red at 320x568 only (41px of line in a 64px box under the card's name), none at 375x761
// CONTROL-RECORD: 01a124ac 2026-11-19 total=571 red=6 scope=trial:d45998d53c19 how=batch 13 control, not in the pair: the Deflection board given luft (h6) under unchanged words - its hint, explanation and wrong-try sentence red at each size (the rook is not forced to take and Rxe8 is no mate); a board changed under its words is seen by the claim, not by the wording
// CONTROL-RECORD: 01a124ac 2026-11-19 total=575 red=1 scope=trial:4cebd0a0fbdb how=batch 13, TC-R246e: the tree one commit before the sideways slot was given a fixed height (01a124ac's chess.jsx) - 'the board and the Hint and Show answer buttons stay exactly where they were' red at 568x320 (the buttons 16px lower while a three-line wrong-try line shows, on Fork, Pin, Discovered check and more); every other line green
const L=require('../lib');
const E=require('../engine-extract');
const D=require('../drive/lesson');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const APP=process.env.CT_APP||path.join(__dirname,'..','..','app.js');
const src=fs.readFileSync(APP,'utf8');
console.log('     bundle: '+APP+'  md5 '+crypto.createHash('md5').update(src).digest('hex').slice(0,12)+'   rules: chess.jsx md5 '+E.SOURCE_MD5);
const GEOS=(process.env.CT_G175_GEOS||'kunal761,se').split(',');
const BARE='Not the key move. Try again.';

// ── the rows, out of the bundle ─────────────────────────────────────────────────────────────────────────────────────────────────────
function rowsAt(re){const out=[];let m;const R=new RegExp(re,'g');
  while((m=R.exec(src))){let i=m.index+1;const o={};
    for(;;){const k=/^([A-Za-z_$][\w$]*):"/.exec(src.slice(i,i+40));if(!k)break;i+=k[0].length;let j=i;while(src[j]!=='"'){if(src[j]==='\\')j++;j++;}
      try{o[k[1]]=JSON.parse('"'+src.slice(i,j)+'"');}catch(e){o[k[1]]=src.slice(i,j);}i=j+1;if(src[i]===',')i++;else break;}
    out.push(o);}
  return out;}
const TAC=rowsAt('\\{motif:"[^"]+",level:"[^"]+",fen:"');
const STR=rowsAt('\\{title:"[^"]+",fen:"[^"]+",text:"');

// ── the board, and who attacks what (computed here, not by the app) ─────────────────────────────────────────────────────────────────
const FILES='abcdefgh';
const rc=s=>[8-(+s[1]),FILES.indexOf(s[0])];
const sqn=(r,c)=>FILES[c]+(8-r);
const inB=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const at=(bd,s)=>{const [r,c]=rc(s);return bd[r][c];};
const VAL={p:1,n:3,b:3,r:5,q:9,k:0};
function attackers(bd,r,c,by){const out=[];
  for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){const R=r+dr,C=c+dc;if(inB(R,C)&&bd[R][C]&&bd[R][C].c===by&&bd[R][C].t==='n')out.push({r:R,c:C,t:'n'});}
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const R=r+dr,C=c+dc;if(inB(R,C)&&bd[R][C]&&bd[R][C].c===by&&bd[R][C].t==='k')out.push({r:R,c:C,t:'k'});}
  const pr=by==='w'?r+1:r-1;for(const C of [c-1,c+1])if(inB(pr,C)&&bd[pr][C]&&bd[pr][C].c===by&&bd[pr][C].t==='p')out.push({r:pr,c:C,t:'p'});
  for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){let R=r+dr,C=c+dc;while(inB(R,C)&&!bd[R][C]){R+=dr;C+=dc;}
    if(inB(R,C)&&bd[R][C].c===by){const t=bd[R][C].t;if(t==='q'||(t==='r'&&(!dr||!dc))||(t==='b'&&dr&&dc))out.push({r:R,c:C,t});}}
  return out;}
const find=(bd,t,c)=>{const o=[];for(let r=0;r<8;r++)for(let k=0;k<8;k++)if(bd[r][k]&&bd[r][k].t===t&&bd[r][k].c===c)o.push([r,k]);return o;};
const opp=c=>c==='w'?'b':'w';
const legal=p=>E.getLegal(p);
const mk=(p,m)=>E.makeMove(p,m);
const san=(p,m)=>E.toSAN(p,m,E.applyMove(p.board,m));
const st=p=>E.getStatus(p);
const isMate=p=>st(p)==='checkmate';
const inCheck=p=>st(p)==='check'||st(p)==='checkmate';
const checkers=p=>{const k=find(p.board,'k',p.turn)[0];return attackers(p.board,k[0],k[1],opp(p.turn));};
const mover=(p,m)=>p.board[m.fr][m.fc];
const target=(p,m)=>p.board[m.tr][m.tc];
const to=m=>sqn(m.tr,m.tc), from=m=>sqn(m.fr,m.fc);
const movesOf=(p,t)=>legal(p).filter(m=>mover(p,m).t===t);
const hits=(p2,m,s)=>{const [r,c]=rc(s);return attackers(p2.board,r,c,opp(p2.turn)).some(a=>a.r===m.tr&&a.c===m.tc);};   // after m, does the moved piece attack s
const sans=(p,ms)=>ms.map(m=>san(p,m));
const only=(p,ms,key)=>ms.length===1&&ms[0].fr===key.fr&&ms[0].fc===key.fc&&ms[0].tr===key.tr&&ms[0].tc===key.tc;
const material=(bd,c)=>{let s=0;for(let r=0;r<8;r++)for(let k=0;k<8;k++)if(bd[r][k]&&bd[r][k].c===c)s+=VAL[bd[r][k].t];return s;};
const pawns=(bd,c)=>find(bd,'p',c).map(([r,k])=>sqn(r,k));
const light=s=>{const [r,c]=rc(s);return (r+c)%2===0;};
// a check whose ONLY legal answer is to take the checker with `taker`, after which the mover has a mate in one by `mater`
const forcedThenMate=(p,m,taker,mater)=>{const p2=mk(p,m);if(st(p2)!=='check')return false;const rs=legal(p2);
  if(rs.length!==1||mover(p2,rs[0]).t!==taker||to(rs[0])!==to(m))return false;const p3=mk(p2,rs[0]);return legal(p3).some(x=>mover(p3,x).t===mater&&isMate(mk(p3,x)));};
// the piece standing directly behind the checked king on the line from the checker
const behindKing=(p2,m)=>{const k=find(p2.board,'k',p2.turn)[0];const dr=Math.sign(k[0]-m.tr),dc=Math.sign(k[1]-m.tc);if((dr&&dc&&Math.abs(k[0]-m.tr)!==Math.abs(k[1]-m.tc))||(!dr&&!dc))return null;
  let R=k[0]+dr,C=k[1]+dc;while(inB(R,C)&&!p2.board[R][C]){R+=dr;C+=dc;}return inB(R,C)?p2.board[R][C]:null;};

// ── TC-R246b: the Tactics claims. [field, the words that carry the claim, what must be true of the position] ───────────────────────
// x = {p: the position, key: the stored move, a: the position after it, row}
const kingOnly=(x)=>legal(x.a).every(m=>mover(x.a,m).t==='k');
const thenTakes=(x,piece,victim,sq)=>legal(x.a).every(r=>{const p3=mk(x.a,r);return legal(p3).some(m=>mover(p3,m).t===piece&&target(p3,m)&&target(p3,m).t===victim&&(!sq||to(m)===sq));});
const TCL={
 'Fork':[
  ['explain',/forks the king and queen/,x=>st(x.a)==='check'&&find(x.a.board,'q','b').every(([r,c])=>hits(x.a,x.key,sqn(r,c)))],
  ['explain',/The king must move out of check, then you simply take the queen/,x=>kingOnly(x)&&thenTakes(x,'n','q')],
  ['hint',/A knight check that also attacks the queen/,x=>mover(x.p,x.key).t==='n'&&st(x.a)==='check'&&hits(x.a,x.key,sqn(...find(x.a.board,'q','b')[0]))],
  ['miss',/^Have another look: one knight jump checks the king and hits the queen at the same time\.$/,x=>only(x.p,movesOf(x.p,'n').filter(m=>{const a=mk(x.p,m);return inCheck(a)&&hits(a,m,sqn(...find(a.board,'q','b')[0]));}),x.key)]],
 'Pin':[
  ['hint',/The rook pins the knight to its king, so the knight is not allowed to move/,x=>{const b={...x.p,turn:'b',ep:null};const none=legal(b).filter(m=>from(m)==='g6').length===0;
     const bd=x.p.board.map(r=>r.slice());bd[2][6]=null;const k=find(bd,'k','b')[0];return none&&attackers(bd,k[0],k[1],'w').some(a=>a.t==='r'&&sqn(a.r,a.c)==='g1');}],
  ['explain',/The rook on g1 pins the knight to the king, so it cannot run from your pawn\. Take it: hxg6/,x=>san(x.p,x.key)==='hxg6'&&target(x.p,x.key).t==='n'&&at(x.p.board,'g1').t==='r'],
  ['miss',/pinned to its king, so it cannot run away/,x=>{const b={...x.p,turn:'b',ep:null};const bd=x.p.board.map(r=>r.slice());bd[2][6]=null;const k=find(bd,'k','b')[0];return legal(b).filter(m=>from(m)==='g6').length===0&&attackers(bd,k[0],k[1],'w').some(a=>a.t==='r'&&sqn(a.r,a.c)==='g1');}],
  ['miss',/^The g6 knight is pinned to its king, so it cannot run away\. Take it with your cheapest piece\.$/,x=>{const cs=legal(x.p).filter(m=>to(m)==='g6');const v=m=>VAL[mover(x.p,m).t];
     return at(x.p.board,'g6').t==='n'&&cs.length>=2&&cs.every(m=>m===cs.find(k=>from(k)===from(x.key))||v(m)>v(x.key))&&cs.some(k=>from(k)===from(x.key));}]],
 'Skewer':[
  ['explain',/Rg1\+ skewers the king and queen on the g-file/,x=>san(x.p,x.key)==='Rg1+'&&(()=>{const b=behindKing(x.a,x.key);return !!b&&b.t==='q'&&b.c==='b';})()&&find(x.a.board,'k','b')[0][1]===6&&find(x.a.board,'q','b')[0][1]===6],
  ['explain',/The king must step aside, then Rxg8 wins the queen/,x=>kingOnly(x)&&legal(x.a).every(r=>{const p3=mk(x.a,r);const m=legal(p3).find(k=>san(p3,k).replace(/[+#]/,'')==='Rxg8');return !!m&&target(p3,m).t==='q'&&!legal(mk(p3,m)).some(k=>to(k)==='g8');})],
  ['hint',/Check the king down the g-file/,x=>to(x.key)[0]==='g'&&st(x.a)==='check'],
  ['miss',/so the queen falls next/,x=>kingOnly(x)&&legal(x.a).every(r=>{const p3=mk(x.a,r);const m=legal(p3).find(k=>mover(p3,k).t==='r'&&target(p3,k)&&target(p3,k).t==='q');return !!m&&!legal(mk(p3,m)).some(k=>to(k)===to(m));})],
  ['miss',/^Look again: one rook check has the queen standing right behind the king, so the queen falls next\.$/,x=>only(x.p,movesOf(x.p,'r').filter(m=>{const a=mk(x.p,m);if(!inCheck(a))return false;const b=behindKing(a,m);return !!b&&b.t==='q'&&b.c==='b';}),x.key)]],
 'Discovered check':[
  ['idea',/Move one piece so another delivers check, and take something on the way/,x=>!!target(x.p,x.key)&&checkers(x.a).length>0&&checkers(x.a).every(a=>!(a.r===x.key.tr&&a.c===x.key.tc))],
  ['explain',/Nxd7\+ grabs the queen and uncovers the rook check on the e-file/,x=>san(x.p,x.key)==='Nxd7+'&&target(x.p,x.key).t==='q'&&checkers(x.a).length===1&&checkers(x.a)[0].t==='r'&&checkers(x.a)[0].c===4],
  ['explain',/Black can take the knight back with Kxd7, but the queen is gone and White is left a whole rook up/,x=>{const r=legal(x.a).find(m=>san(x.a,m)==='Kxd7');if(!r)return false;const p3=mk(x.a,r);return material(p3.board,'w')===5&&material(p3.board,'b')===0&&find(p3.board,'r','w').length===1;}],
  ['hint',/Move the knight, and the rook gives check down the e-file/,x=>movesOf(x.p,'n').length>0&&movesOf(x.p,'n').every(m=>checkers(mk(x.p,m)).some(a=>a.t==='r'&&a.c===4))],
  ['miss',/^Every knight move here gives check from the rook\. Pick the one that also takes the queen\.$/,x=>movesOf(x.p,'n').length>1&&movesOf(x.p,'n').every(m=>checkers(mk(x.p,m)).some(a=>a.t==='r'))&&only(x.p,movesOf(x.p,'n').filter(m=>target(x.p,m)&&target(x.p,m).t==='q'),x.key)]],
 'Back-rank mate':[
  ['idea',/Mate in one/,x=>isMate(x.a)],
  ['explain',/Ra8# is checkmate\. The f7, g7 and h7 pawns that shelter the king also trap it on the back rank/,x=>san(x.p,x.key)==='Ra8#'&&isMate(x.a)&&['f7','g7','h7'].every(s=>{const q=at(x.p.board,s);return q&&q.t==='p'&&q.c==='b';})&&find(x.p.board,'k','b')[0][0]===0],
  ['hint',/fenced in by its own pawns on the back rank/,x=>{const k=find(x.p.board,'k','b')[0];return k[0]===0&&[-1,0,1].every(d=>{const q=inB(1,k[1]+d)?x.p.board[1][k[1]+d]:null;return !inB(1,k[1]+d)||(q&&q.c==='b'&&q.t==='p');});}],
  ['miss',/where the king's own pawns hem it in/,x=>{const k=find(x.p.board,'k','b')[0];return k[0]===0&&[-1,0,1].every(d=>{if(!inB(1,k[1]+d))return true;const q=x.p.board[1][k[1]+d];return !!q&&q.c==='b'&&q.t==='p';});}],
  ['miss',/^Have another look: there is a mate in one on the back rank, where the king's own pawns hem it in\.$/,x=>only(x.p,legal(x.p).filter(m=>isMate(mk(x.p,m))),x.key)&&x.key.tr===0]],
 'Smothered mate':[
  ['idea',/Mate in one/,x=>isMate(x.a)],
  ['explain',/Nf7# is the smothered mate\. The king is hemmed in by its own rook and pawns/,x=>{const k=find(x.p.board,'k','b')[0];let all=true,kinds=new Set();for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const R=k[0]+dr,C=k[1]+dc;if(!inB(R,C))continue;const q=x.p.board[R][C];if(!q||q.c!=='b')all=false;else kinds.add(q.t);}
     return san(x.p,x.key)==='Nf7#'&&isMate(x.a)&&all&&kinds.has('r')&&kinds.has('p')&&kinds.size===2;}],
  ['miss',/the king is boxed in by its own pieces/,x=>{const k=find(x.p.board,'k','b')[0];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const R=k[0]+dr,C=k[1]+dc;if(!inB(R,C))continue;const q=x.p.board[R][C];if(!q||q.c!=='b')return false;}return true;}],
  ['miss',/^There is a mate in one here, and only the knight can give it: the king is boxed in by its own pieces\.$/,x=>only(x.p,legal(x.p).filter(m=>isMate(mk(x.p,m))),x.key)&&mover(x.p,x.key).t==='n']],
 'Double attack':[
  ['explain',/Qd8\+ is a double attack: it checks the king and attacks the rook on b6/,x=>san(x.p,x.key)==='Qd8+'&&at(x.a.board,'b6').t==='r'&&hits(x.a,x.key,'b6')],
  ['explain',/Black must answer the check with Kh7, then Qxb6 wins the rook/,x=>{const rs=legal(x.a);if(rs.length!==1||san(x.a,rs[0])!=='Kh7')return false;const p3=mk(x.a,rs[0]);const m=legal(p3).find(k=>san(p3,k).replace(/[+#]/,'')==='Qxb6');return !!m&&!legal(mk(p3,m)).some(k=>to(k)==='b6');}],
  ['hint',/the short diagonal down to b6/,x=>{const [r,c]=rc(to(x.key)),[r2,c2]=rc('b6');return Math.abs(r-r2)===Math.abs(c-c2)&&Math.abs(r-r2)===2;}],
  ['miss',/once the king steps away the rook is yours/,x=>{const rs=legal(x.a);return rs.length>0&&rs.every(r=>{if(mover(x.a,r).t!=='k')return false;const p3=mk(x.a,r);const m=legal(p3).find(k=>to(k)==='b6'&&target(p3,k)&&target(p3,k).t==='r');return !!m&&!legal(mk(p3,m)).some(k=>to(k)==='b6');});}],
  ['miss',/^Look again: one queen check also hits the rook on b6, so once the king steps away the rook is yours\.$/,x=>only(x.p,movesOf(x.p,'q').filter(m=>{const a=mk(x.p,m);return inCheck(a)&&at(a.board,'b6')&&at(a.board,'b6').t==='r'&&hits(a,m,'b6');}),x.key)]],
 'Pawn fork':[
  ['explain',/d5 forks the knight on c6 and the bishop on e6/,x=>san(x.p,x.key)==='d5'&&at(x.a.board,'c6').t==='n'&&at(x.a.board,'e6').t==='b'&&hits(x.a,x.key,'c6')&&hits(x.a,x.key,'e6')],
  ['explain',/the e4 pawn guards it, so Bxd5 is no answer/,x=>{const r=legal(x.a).find(m=>san(x.a,m)==='Bxd5');if(!r)return false;const p3=mk(x.a,r);return legal(p3).some(m=>san(p3,m)==='exd5');}],
  ['explain',/whichever one moves, you simply take the other/,x=>legal(x.a).every(r=>{const p3=mk(x.a,r);return legal(p3).some(m=>mover(p3,m).t==='p'&&target(p3,m)&&/[nb]/.test(target(p3,m).t));})],
  ['miss',/Whichever one runs, you take the other/,x=>legal(x.a).every(r=>{const p3=mk(x.a,r);return legal(p3).some(m=>mover(p3,m).t==='p'&&target(p3,m)&&/[nb]/.test(target(p3,m).t));})],
  ['miss',/^Look for the pawn push that attacks the knight and the bishop together\. Whichever one runs, you take the other\.$/,x=>only(x.p,movesOf(x.p,'p').filter(m=>{const a=mk(x.p,m);return ['n','b'].every(t=>find(a.board,t,'b').some(([r,c])=>hits(a,m,sqn(r,c))));}),x.key)]],
 'Double check':[
  ['idea',/two pieces check the king together, and win the queen/,x=>checkers(x.a).length===2&&kingOnly(x)&&thenTakes(x,'n','q')],
  ['explain',/Nf6\+ is a double check, from the knight and the rook/,x=>san(x.p,x.key)==='Nf6+'&&checkers(x.a).map(a=>a.t).sort().join('')==='nr'],
  ['explain',/the king is forced to move, and then Nxg8 scoops the queen/,x=>kingOnly(x)&&thenTakes(x,'n','q','g8')],
  ['hint',/the knight checks the king, and the rook checks down the e-file behind it/,x=>to(x.key)==='f6'&&checkers(x.a).some(a=>a.t==='r'&&a.c===4)&&checkers(x.a).some(a=>a.t==='n')],
  ['miss',/^Two knight moves give double check, and only one of them also attacks the queen\. Find that one\.$/,x=>{const dc=movesOf(x.p,'n').filter(m=>checkers(mk(x.p,m)).length===2);return dc.length===2&&only(x.p,dc.filter(m=>{const a=mk(x.p,m);return hits(a,m,sqn(...find(a.board,'q','b')[0]));}),x.key);}]],
 'Hanging piece':[
  ['hint',/Look at the bishop on b7\. What is guarding it/,x=>at(x.p.board,'b7').t==='b'&&attackers(x.p.board,1,1,'b').length===0],
  ['explain',/Rxb7 wins a whole bishop for free, because nothing defends it/,x=>san(x.p,x.key)==='Rxb7'&&target(x.p,x.key).t==='b'&&!legal(x.a).some(m=>to(m)==='b7')],
  ['miss',/take it for free/,x=>!!target(x.p,x.key)&&target(x.p,x.key).c==='b'&&!legal(x.a).some(m=>to(m)===to(x.key))],
  ['miss',/^Have a look around: one black piece has nothing defending it\. Find it and take it for free\.$/,x=>{let loose=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++){const q=x.p.board[r][c];if(q&&q.c==='b'&&q.t!=='k'&&attackers(x.p.board,r,c,'b').length===0)loose.push(sqn(r,c));}
     return loose.length===1&&loose[0]===to(x.key)&&only(x.p,legal(x.p).filter(m=>to(m)===loose[0]),x.key);}]],
 'Deflection':[
  ['idea',/The rook on a8 is the only thing guarding the back rank/,x=>{const a=attackers(x.p.board,0,4,'b');return a.length===1&&a[0].t==='r'&&sqn(a[0].r,a[0].c)==='a8';}],
  ['hint',/A queen check on e8 that the rook is forced to take/,x=>to(x.key)==='e8'&&mover(x.p,x.key).t==='q'&&forcedThenMate(x.p,x.key,'r','r')],
  ['explain',/the rook must capture \(Rxe8\), abandoning the back rank, and then Rxe8 is checkmate/,x=>{const rs=legal(x.a);if(rs.length!==1||san(x.a,rs[0])!=='Rxe8')return false;const p3=mk(x.a,rs[0]);return legal(p3).some(m=>san(p3,m)==='Rxe8#'&&isMate(mk(p3,m)));}],
  ['miss',/^Look for the queen check that the a8 rook is forced to take\. Once the rook leaves, you mate\.$/,x=>at(x.p.board,'a8').t==='r'&&only(x.p,movesOf(x.p,'q').filter(m=>forcedThenMate(x.p,m,'r','r')||forcedThenMate(x.p,m,'r','q')),x.key)]],
 'Decoy':[
  ['hint',/Give up the queen with check on g8/,x=>to(x.key)==='g8'&&mover(x.p,x.key).t==='q'&&st(x.a)==='check'],
  ['explain',/Rxg8 is forced, and now the king is smothered by its own pieces, so Nf7 is checkmate/,x=>{const rs=legal(x.a);if(rs.length!==1||san(x.a,rs[0])!=='Rxg8')return false;const p3=mk(x.a,rs[0]);return legal(p3).some(m=>san(p3,m)==='Nf7#'&&isMate(mk(p3,m)));}],
  ['miss',/the rook boxes in its own king/,x=>{const rs=legal(x.a);if(rs.length!==1||mover(x.a,rs[0]).t!=='r')return false;const p3=mk(x.a,rs[0]);const k=find(p3.board,'k','b')[0];let nextTo=false;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const R=k[0]+dr,C=k[1]+dc;if(!inB(R,C))continue;const q=p3.board[R][C];if(!q||q.c!=='b')return false;if(R===rs[0].tr&&C===rs[0].tc)nextTo=true;}return nextTo;}],
  ['miss',/^Look for the check the rook is forced to take\. Then the rook boxes in its own king, and your knight mates\.$/,x=>only(x.p,legal(x.p).filter(m=>forcedThenMate(x.p,m,'r','n')),x.key)]],
 'Discovered attack':[
  ['explain',/Nxd7 wins the queen and, by stepping aside, uncovers the bishop's attack on the rook on h8/,x=>san(x.p,x.key)==='Nxd7'&&target(x.p,x.key).t==='q'&&at(x.p.board,'h8').t==='r'&&!attackers(x.p.board,0,7,'w').some(a=>a.t==='b')&&attackers(x.a.board,0,7,'w').some(a=>a.t==='b'&&sqn(a.r,a.c)==='b2')],
  ['explain',/Black has lost the queen for nothing and must save the rook as well/,x=>!legal(x.a).some(m=>to(m)===to(x.key))&&find(x.a.board,'q','b').length===0],
  ['hint',/the bishop on b2 looks straight down the long diagonal/,x=>at(x.p.board,'b2').t==='b'&&at(x.p.board,'b2').c==='w'],
  ['miss',/^Have another look: one knight move takes the queen and uncovers your bishop's attack on the h8 rook\.$/,x=>only(x.p,movesOf(x.p,'n').filter(m=>target(x.p,m)&&target(x.p,m).t==='q'&&attackers(mk(x.p,m).board,0,7,'w').some(a=>a.t==='b')),x.key)]],
};

// ── TC-R246c: the Strategy claims. [field, the words, what must be true of the position p] ──────────────────────────────────────────
const P=fen=>E.fromFEN(fen);
const isP=(bd,s,c)=>{const q=at(bd,s);return !!q&&q.t==='p'&&q.c===c;};
const passed=(bd,s,c)=>{const [r,k]=rc(s);for(let R=0;R<8;R++)for(const C of [k-1,k,k+1]){if(!inB(R,C))continue;const q=bd[R][C];if(q&&q.t==='p'&&q.c===opp(c)&&(c==='w'?R<r:R>r))return false;}return true;};
const knightReach=s=>{const [r,c]=rc(s);return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].filter(([a,b])=>inB(r+a,c+b)).length;};
const bishopReach=(bd,s)=>{const [r,c]=rc(s);let n=0;for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]){let R=r+dr,C=c+dc;while(inB(R,C)&&!bd[R][C]){n++;R+=dr;C+=dc;}if(inB(R,C)&&bd[R][C].c!==bd[r][c].c)n++;}return n;};
// White only pushes the pawn from `s`; can Black, with any moves, ever take it or the queen it becomes?
const pawnRuns=(p,s)=>{const [r,c]=rc(s);if(r===0)return !legal(p).some(m=>m.tr===0&&m.tc===c);   // promoted: Black to move must not be able to take
  const m=legal(p).find(x=>x.fr===r&&x.fc===c&&x.tc===c&&x.tr===r-1&&(!x.promo||x.promo==='q'));if(!m)return false;const p2=mk(p,m.promo?m:{...m,promo:r-1===0?'q':undefined});
  const ns=sqn(r-1,c);if(r-1===0)return !legal(p2).some(x=>x.tr===0&&x.tc===c);
  return legal(p2).every(x=>!(x.tr===r-1&&x.tc===c)&&pawnRuns(mk(p2,x),ns));};
const SCL={
 'Control the center':[['text',/White has built a broad pawn center on d4 and e4/,p=>isP(p.board,'d4','w')&&isP(p.board,'e4','w')],['look',/Big pawn center on d4 and e4/,p=>isP(p.board,'d4','w')&&isP(p.board,'e4','w')]],
 'Develop and castle early':[['text',/White is developed and castled; Black still has work to do/,p=>sqn(...find(p.board,'k','w')[0])==='g1'&&at(p.board,'f1')&&at(p.board,'f1').t==='r'&&!p.castling.wK&&!p.castling.wQ&&sqn(...find(p.board,'k','b')[0])==='e8'&&(p.castling.bK||p.castling.bQ)],
   ['look',/Pieces out, king safely castled on g1/,p=>sqn(...find(p.board,'k','w')[0])==='g1'&&[...find(p.board,'n','w'),...find(p.board,'b','w')].filter(([r])=>r!==7).length>=2]],
 'Put rooks on open files':[['text',/An open file has no pawns on it/,p=>[0,1,2,3,4,5,6,7].every(r=>!p.board[r][2]||p.board[r][2].t!=='p')],
   ['text',/Owning it lets a rook invade deep into the enemy camp/,p=>movesOf(p,'r').some(m=>m.tc===2&&m.tr<=1&&(()=>{const a=mk(p,m);return !legal(a).some(x=>isMate(mk(a,x)))&&attackers(a.board,m.tr,m.tc,'b').length===0;})())],
   ['look',/Rook on the open c-file/,p=>find(p.board,'r','w').some(([,c])=>c===2)]],
 'Knights love outposts':[['text',/no enemy pawn can chase it away, ideally guarded by one of your own pawns\. The d5 knight/,p=>{const q=at(p.board,'d5');return !!q&&q.t==='n'&&q.c==='w'&&!find(p.board,'p','b').some(([r,c])=>(c===2||c===4)&&r<3)&&attackers(p.board,3,3,'w').some(a=>a.t==='p');}],
   ['look',/Knight on d5, backed by the e4 pawn/,p=>attackers(p.board,3,3,'w').some(a=>a.t==='p'&&sqn(a.r,a.c)==='e4')]],
 'The bishop pair':[['text',/Two bishops cover squares of both colors/,p=>{const b=find(p.board,'b','w');return b.length===2&&light(sqn(...b[0]))!==light(sqn(...b[1]));}],
   ['look',/White has both bishops; Black has a bishop and a knight/,p=>find(p.board,'b','w').length===2&&find(p.board,'b','b').length===1&&find(p.board,'n','b').length===1&&find(p.board,'n','w').length===0&&material(p.board,'w')===material(p.board,'b')]],
 'King safety first':[['text',/Black is tucked away here, while White has not castled yet/,p=>sqn(...find(p.board,'k','b')[0])==='g8'&&['f7','g7','h7'].every(s=>isP(p.board,s,'b'))&&!p.castling.bK&&!p.castling.bQ&&sqn(...find(p.board,'k','w')[0])==='e1'&&(p.castling.wK||p.castling.wQ)],
   ['look',/Black is castled and shielded; White is still in the middle/,p=>sqn(...find(p.board,'k','w')[0])==='e1']],
 'Rooks love the 7th rank':[['text',/A rook on the 7th rank attacks the enemy pawns from the side and ties the king to defending them/,p=>{const r=find(p.board,'r','w').filter(([R])=>R===1);if(r.length!==1)return false;
     const hit=find(p.board,'p','b').filter(([R,C])=>attackers(p.board,R,C,'w').some(a=>a.t==='r'&&a.r===1));return hit.length>=1&&hit.every(([R,C])=>{const d=attackers(p.board,R,C,'b');return d.length===1&&d[0].t==='k';});}],
   ['look',/White rook on a7, attacking f7, which only the king defends/,p=>{const q=at(p.board,'a7');const d=attackers(p.board,1,5,'b');return !!q&&q.t==='r'&&q.c==='w'&&isP(p.board,'f7','b')&&attackers(p.board,1,5,'w').some(a=>sqn(a.r,a.c)==='a7')&&d.length===1&&d[0].t==='k';}]],
 'Passed pawns must be pushed':[['text',/A passed pawn has no enemy pawn in front of it or on the files beside it/,p=>isP(p.board,'d5','w')&&passed(p.board,'d5','w')],
   ['text',/here the h8 king is too far away to catch it, so d6 wins outright/,p=>sqn(...find(p.board,'k','b')[0])==='h8'&&p.turn==='w'&&pawnRuns(p,'d5')],
   ['text',/Were the king on g8, inside the square, you would bring your own king up first/,p=>{const bd=p.board.map(r=>r.slice());bd[0][6]=bd[0][7];bd[0][7]=null;return !pawnRuns({...p,board:bd},'d5');}],
   ['look',/The d5 pawn has a clear run: the h8 king is outside its square/,p=>pawnRuns(p,'d5')]],
 'Trade pieces when you are ahead':[['look',/White is well ahead, so simplify toward the win/,p=>material(p.board,'w')-material(p.board,'b')>=5&&legal(p).some(m=>target(p,m)&&target(p,m).t===mover(p,m).t&&mover(p,m).t!=='p')]],
 'Keep your queen home early':[['text',/Bringing the queen out in the first few moves/,p=>/ [12] *$/.test(p._fen)&&at(p.board,'h5')&&at(p.board,'h5').t==='q'&&at(p.board,'h5').c==='w'&&at(p.board,'d8')&&at(p.board,'d8').t==='q'],
   ['look',/The lone queen on h5 will just be chased around/,p=>['b1','g1','c1','f1','a1','h1'].every(s=>at(p.board,s)&&at(p.board,s).c==='w')&&p.turn==='b']],
 'Doubled pawns are a weakness':[['text',/Two pawns stacked on the same file cannot defend each other/,p=>{const f=find(p.board,'p','w').filter(([,c])=>c===5);return f.length===2&&f.every(([r,c])=>!attackers(p.board,r,c,'w').some(a=>a.t==='p'));}],
   ['look',/White has doubled f-pawns that cannot support each other/,p=>find(p.board,'p','w').filter(([,c])=>c===5).length===2&&find(p.board,'p','b').every(([,c],i,a)=>a.filter(z=>z[1]===c).length===1)]],
 'A knight on the rim is dim':[['text',/A knight in the center can reach up to eight squares; a knight on the edge reaches only four, and in the corner just two/,p=>{const n=find(p.board,'n','w');return n.length===1&&knightReach(sqn(...n[0]))===4&&knightReach('e4')===8&&knightReach('a1')===2&&movesOf(p,'n').length===4;}],
   ['look',/The a3 knight is stuck on the edge/,p=>at(p.board,'a3')&&at(p.board,'a3').t==='n']],
 'Rooks belong behind passed pawns':[['look',/White's rook backs its a-pawn; Black's rook sits passively in front/,p=>{const pw=find(p.board,'p','w').filter(([,c])=>c===0);const rw=find(p.board,'r','w'),rb=find(p.board,'r','b');
     return pw.length===1&&passed(p.board,sqn(...pw[0]),'w')&&rw.length===1&&rw[0][1]===0&&rw[0][0]>pw[0][0]&&rb.length===1&&rb[0][1]===0&&rb[0][0]<pw[0][0];}]],
 'Good bishop, bad bishop':[['look',/Black's bishop is buried behind its own d5 and e6 pawns; White's rakes the long diagonal/,p=>{const bb=sqn(...find(p.board,'b','b')[0]),wb=sqn(...find(p.board,'b','w')[0]);
     return isP(p.board,'d5','b')&&isP(p.board,'e6','b')&&light('d5')===light(bb)&&light('e6')===light(bb)&&pawns(p.board,'w').every(s=>light(s)!==light(wb))&&(()=>{const [r,c]=rc(wb);return r===c;})()&&bishopReach(p.board,bb)<bishopReach(p.board,wb);}],
   ['text',/A bishop hemmed in by its own pawns sitting on its own color is a bad bishop/,p=>{const bb=sqn(...find(p.board,'b','b')[0]);return pawns(p.board,'b').filter(s=>light(s)===light(bb)).length>=2;}]],
 'Space gives your pieces room':[['look',/White's pawns on the fourth rank grant a clear space edge/,p=>find(p.board,'p','w').filter(([r])=>r===4).length>=3&&find(p.board,'p','b').every(([r])=>r<=2)]],
 'The opposition':[['text',/when the kings face each other one square apart and it is the OTHER side's move, you have the opposition/,p=>{const w=find(p.board,'k','w')[0],b=find(p.board,'k','b')[0];return w[1]===b[1]&&Math.abs(w[0]-b[0])===2&&!p.board[(w[0]+b[0])/2][w[1]];}],
   ['look',/With Black to move, White holds the opposition/,p=>p.turn==='b'&&find(p.board,'p','w').length===1]],
 'Connected passed pawns':[['text',/Two passed pawns on neighboring files protect each other as they advance/,p=>{const w=find(p.board,'p','w');if(w.length!==2||Math.abs(w[0][1]-w[1][1])!==1||!w.every(([r,c])=>passed(p.board,sqn(r,c),'w')))return false;
     const m=legal(p).find(x=>mover(p,x).t==='p');const a=mk(p,m);return attackers(a.board,m.tr,m.tc,'w').some(z=>z.t==='p');}],
   ['look',/The b- and c-pawns guard each other and roll forward together/,p=>isP(p.board,'b5','w')&&isP(p.board,'c5','w')]],
 'Activate your king in the endgame':[['look',/White's king strides to the center while Black's stays at home/,p=>['d4','e4','d5','e5'].includes(sqn(...find(p.board,'k','w')[0]))&&find(p.board,'k','b')[0][0]===0&&find(p.board,'q','w').length+find(p.board,'q','b').length===0]],
};

// ── reading the screen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const readTac=b=>b.page.evaluate(()=>new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const q=s=>document.querySelector(s);const box=q('[data-ct="tactics-idea"]')||q('[data-ct="tactics-strat-text"]');const kids=box?[...box.children]:[];
  const tx=e=>e?(e.textContent||''):null;const br=box?box.getBoundingClientRect():null;
  const w=box?[...box.querySelectorAll('div,span')].find(e=>e.children.length===0&&getComputedStyle(e).color==='rgb(240, 162, 78)'):null;const wr=w?w.getBoundingClientRect():null;
  const bd=q('[data-ct="tactics-board"]');const srcs=[];const cells=bd?[...bd.children].map(c=>{const im=c.querySelector('img');if(!im)return -1;let i=srcs.indexOf(im.src);if(i<0){srcs.push(im.src);i=srcs.length-1;}return i;}):[];
  const ans=q('[data-ct="tactics-answer"]');const hint=q('[data-ct="tactics-hint"]');
  res({kind:box?box.getAttribute('data-ct'):null,head:kids[0]&&kids[0].children[0]?tx(kids[0].children[0]):null,chip:kids[0]&&kids[0].children[1]?tx(kids[0].children[1]):null,
    parts:kids.slice(1).map(tx),wrong:tx(w),wrongIn:(wr&&br)?(wr.top>=br.top-0.5&&wr.bottom<=br.bottom+0.5&&wr.height>0):null,wrongH:wr?Math.round(wr.height):null,boxH:br?Math.round(br.height):null,
    cells,ans:ans?[...ans.children].map(tx):null,hint:tx(hint),
    wrongFs:w?parseFloat(getComputedStyle(w).fontSize):null,boxFs:box?parseFloat(getComputedStyle(box).fontSize):null,
    boardAt:bd?(r=>[r.left,r.top,r.width,r.height].map(v=>Math.round(v*10)/10).join(','))(bd.getBoundingClientRect()):null,
    rowAt:(e=>e?(r=>[r.left,r.top,r.width,r.height].map(v=>Math.round(v*10)/10).join(','))(e.getBoundingClientRect()):null)(q('[data-ct="tactics-row"]')),
    boxAt:br?[br.left,br.top,br.width,br.height].map(v=>Math.round(v*10)/10).join(','):null,pageScroll:(e=>e?e.scrollHeight-e.clientHeight:null)(document.getElementById('root'))});}))));
const boardMatches=(cells,fen)=>{const p=P(fen);if(cells.length!==64)return 'the board has '+cells.length+' squares';const kindOf={},srcOf={};
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const q=p.board[r][c],s=cells[r*8+c];if(!q&&s!==-1)return 'a piece is drawn on empty '+sqn(r,c);if(q&&s===-1)return 'no piece is drawn on '+sqn(r,c);
    if(q){const k=q.c+q.t;if(kindOf[s]!==undefined&&kindOf[s]!==k)return 'one picture for '+kindOf[s]+' and '+k+' ('+sqn(r,c)+')';if(srcOf[k]!==undefined&&srcOf[k]!==s)return 'two pictures for '+k+' ('+sqn(r,c)+')';kindOf[s]=k;srcOf[k]=s;}}
  return '';};
const click=async(b,sq)=>{const c=await b.sqCenter(sq);await b.page.mouse.click(c.x,c.y);};

L.run(async()=>{
  for(const geo of GEOS){
    const g=geo+' ';
    const b=await L.launch({geo,name:'g175-'+geo});await b.open();
    let reached=true;try{await D.states['tactics'](b);await b.settle(700);}catch(e){reached=false;}
    const first=reached?await readTac(b):{};
    if(!L.say(reached&&first.kind==='tactics-idea'&&TAC.length===13&&STR.length===18,g+'TC-R246d PRECONDITION Tactics is on screen and the bundle carries 13 Tactics rows and 18 Strategy rows ('+TAC.length+', '+STR.length+')',{reached,kind:first.kind})){await b.close();continue;}
    // ── Tactics: every card ──
    for(let i=0;i<TAC.length;i++){const row=TAC[i];const nm='Tactics "'+row.motif+'"';const p=P(row.fen);
      const key=legal(p).find(m=>from(m)===row.from&&to(m)===row.to);
      let s=await readTac(b);
      L.say(s.head===row.motif&&s.parts.length===1&&s.parts[0]===row.idea&&s.chip===row.level+' · '+(i+1)+'/'+TAC.length,g+'TC-R246d '+nm+': the screen shows the card\'s name, place and idea as the row has them',{head:s.head,chip:s.chip,parts:s.parts});
      const bm=boardMatches(s.cells,row.fen);L.say(bm==='',g+'TC-R246d '+nm+': the board on screen is the row\'s position, square by square'+(bm?' ('+bm+')':''),row.fen);
      if(!L.say(!!key&&san(p,key)===row.san,g+'TC-R246b '+nm+': the stored move is legal and its name is the one the card prints ('+row.san+')',key?san(p,key):'no such legal move')){await b.tapCt('tactics-show',200);await b.tapCt('tactics-next',250);continue;}
      // the hint, read off the screen
      await b.tapCt('tactics-hintbtn',120);s=await readTac(b);const hintShown=s.hint;await b.tapCt('tactics-hintbtn',120);
      L.say(hintShown==='💡 '+row.hint,g+'TC-R246d '+nm+': the hint on screen is the row\'s hint',hintShown);
      // TC-R246a: play every legal wrong move
      const wrongs=legal(p).filter(m=>m!==key&&!(m.fr===key.fr&&m.fc===key.fc&&m.tr===key.tr&&m.tc===key.tc));
      const bare=[],untrue=[],other=[],cut=[],shrunk=[],tiny=[],jumped=[];let nWhy=0,nMiss=0,maxH=0,minFs=99;const still=s;
      for(const m of wrongs){await click(b,from(m));await click(b,to(m));s=await readTac(b);const T=s.wrong,S=san(p,m);let mm;
        if(T==null||T===''||T===BARE){bare.push(S+' -> '+JSON.stringify(T));continue;}
        if(s.wrongIn!==true)cut.push(S+' ('+s.wrongH+' in a box of '+s.boxH+')');maxH=Math.max(maxH,s.wrongH||0);
        if(s.wrongFs!=null){minFs=Math.min(minFs,s.wrongFs);if(s.wrongFs<s.boxFs-0.01)shrunk.push(S+' '+s.wrongFs+'px');if(s.wrongFs<11.5-0.01)tiny.push(S+' '+s.wrongFs+'px');}
        if(s.boardAt!==still.boardAt||s.rowAt!==still.rowAt||s.boxAt!==still.boxAt||s.pageScroll>0)jumped.push(S+': board '+still.boardAt+' -> '+s.boardAt+', box '+still.boxAt+' -> '+s.boxAt+', row '+still.rowAt+' -> '+s.rowAt+', page scroll '+s.pageScroll);
        if((mm=/^(\S+) allows mate \((\S+)\)\. Try again\.$/.exec(T))){nWhy++;const a=mk(p,m);const r=legal(a).find(x=>san(a,x)===mm[2]);if(mm[1]!==S||!r||!isMate(mk(a,r)))untrue.push(T);}
        else if((mm=/^(\S+) (hangs|drops) the (pawn|knight|bishop|rook|queen) \((\S+)\)\. Try again\.$/.exec(T))){nWhy++;const a=mk(p,m);const r=legal(a).find(x=>san(a,x).replace(/[+#]$/,'')===mm[4].replace(/[+#]$/,''));
          const v=r&&target(a,r);const nameOf={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen'};
          // true when: the reply is legal, it takes a white piece of the kind named, on the square just moved to (hangs) or another (drops), and the taker is worth less or nothing takes back
          const okk=mm[1]===S&&!!r&&!!v&&v.c==='w'&&nameOf[v.t]===mm[3]&&((mm[2]==='hangs')===(to(r)===to(m)))&&(VAL[mover(a,r).t]<VAL[v.t]||!legal(mk(a,r)).some(x=>to(x)===to(r)));
          if(!okk)untrue.push(T);}
        else if(T==='Not '+S+'. '+row.miss){nMiss++;}
        else other.push(S+' -> '+T);}
      L.say(wrongs.length>0&&bare.length===0,g+'TC-R246a '+nm+': each of its '+wrongs.length+' legal wrong moves, played, shows a reason or the card\'s own line - never the bare fixed line ('+bare.length+' bare)',bare.slice(0,6));
      L.say(other.length===0&&nWhy+nMiss===wrongs.length-bare.length,g+'TC-R246a '+nm+': every wrong-move line is one of the three known forms - a mate allowed, a piece hung, or "Not <move>. <the card\'s line>" ('+nWhy+' from the board, '+nMiss+' the card\'s line)',other.slice(0,4));
      L.say(untrue.length===0,g+'TC-R246a '+nm+': every line that names a mate or a piece hung is true of the board (the reply is legal and mates, or takes that piece there for profit)',untrue.slice(0,4));
      L.say(cut.length===0&&maxH>0,g+'TC-R246a '+nm+': the wrong-move line is wholly inside its box on every one of them (tallest '+maxH+'px)',cut.slice(0,4));
      // TC-R262 (batch 13, his Desk answer to q23: "Longer, friendlier wrong try lines"): the card's line is the longer one, the box keeps its place, and only a short phone draws it smaller
      L.say(typeof row.miss==='string'&&row.miss.length>=80&&/^(Have another look|Have a look around|Look again|Look for|Every|There is|The g6|Two)\b/.test(row.miss),g+'TC-R262 '+nm+': the card\'s wrong-try line is the longer, friendlier one ('+(row.miss||'').length+' characters, at least 80)',row.miss);
      L.say(jumped.length===0&&nMiss>0,g+'TC-R262 '+nm+': while a wrong-try line shows, the board, the card box and the button row stay exactly where they were and the page does not scroll ('+nMiss+' card lines shown)',jumped.slice(0,3));
      if(geo==='kunal761')L.say(shrunk.length===0&&minFs<99,g+'TC-R262 '+nm+': on his phone the wrong-try line is drawn at the box\'s own size on every wrong move (never shrunk; smallest '+minFs+'px)',shrunk.slice(0,4));
      else L.say(tiny.length===0&&minFs<99,g+'TC-R262 '+nm+': on a short phone the wrong-try line may be drawn smaller to fit, never below 11.5px (smallest '+minFs+'px)',tiny.slice(0,4));
      // a tap that is no legal move
      let ill=null;const lg=legal(p);for(let r=0;r<8&&!ill;r++)for(let c=0;c<8&&!ill;c++){const q=p.board[r][c];if(!q||q.c!=='w')continue;for(let R=0;R<8&&!ill;R++)for(let C=0;C<8&&!ill;C++){const t=p.board[R][C];if(t&&t.c==='w')continue;if(!lg.some(m=>m.fr===r&&m.fc===c&&m.tr===R&&m.tc===C))ill=[sqn(r,c),sqn(R,C)];}}
      await click(b,ill[0]);await click(b,ill[1]);s=await readTac(b);
      L.say(typeof row.miss==='string'&&s.wrong==='Not legal. '+row.miss&&s.wrongIn===true,g+'TC-R246a '+nm+': a tap that is no legal move ('+ill[0]+' to '+ill[1]+') says so, with the card\'s own line, inside its box',{shown:s.wrong,inBox:s.wrongIn});
      // TC-R246b: the claims, each against the position
      const x={p,key,a:mk(p,key),row};const claims=TCL[row.motif]||[];
      L.say(claims.length>=3&&claims.some(c=>c[0]==='miss'),g+'TC-R246b '+nm+': DENOMINATOR this gate holds '+claims.length+' claims for the card, its wrong-try line among them',claims.length);
      for(const [field,re,test] of claims){const txt=row[field];let ok=false,err='';const says=typeof txt==='string'&&re.test(txt);if(says){try{ok=!!test(x);}catch(e){err=String(e&&e.message||e);}}
        L.say(says&&ok,g+'TC-R246b '+nm+' '+field+': '+(says?'"'+re.source.replace(/\\(.)/g,'$1').replace(/^\^|\$$/g,'')+'" is true of the position':'the card no longer says the sentence this claim was checked for (re-check the new words against the board)'),err||(says?row.fen:txt));}
      // after all that, the key move still solves it, and the answer on screen is the row's explanation
      await click(b,row.from);await click(b,row.to);await b.settle(120);s=await readTac(b);
      L.say(!!s.ans&&s.ans.length>=2&&/^✓ /.test(s.ans[0])&&s.ans[0].indexOf(row.san)>0&&s.ans[s.ans.length-1]===row.explain,g+'TC-R246a '+nm+': after every wrong try the key move '+row.san+' is accepted and the explanation on screen is the row\'s',s.ans);
      await b.tapCt('tactics-next',250);
    }
    // ── Strategy: every card ──
    await b.tapText(/^Strategy$/);await b.settle(400);
    for(let i=0;i<STR.length;i++){const row=STR[i];const nm='Strategy "'+row.title+'"';const p=P(row.fen);p._fen=row.fen;
      const s=await readTac(b);
      L.say(s.kind==='tactics-strat-text'&&s.head===row.title&&s.parts.length===2&&s.parts[0]==='👀 '+row.look&&s.parts[1]===row.text,g+'TC-R246d '+nm+': the screen shows the card\'s title, look line and text as the row has them',{head:s.head,parts:s.parts});
      const bm=boardMatches(s.cells,row.fen);L.say(bm==='',g+'TC-R246d '+nm+': the board on screen is the row\'s position, square by square'+(bm?' ('+bm+')':''),row.fen);
      const claims=SCL[row.title]||[];
      L.say(claims.length>=1,g+'TC-R246c '+nm+': DENOMINATOR this gate holds '+claims.length+' claim(s) for the card',claims.length);
      for(const [field,re,test] of claims){const txt=row[field];let ok=false,err='';const says=typeof txt==='string'&&re.test(txt);if(says){try{ok=!!test(p);}catch(e){err=String(e&&e.message||e);}}
        L.say(says&&ok,g+'TC-R246c '+nm+' '+field+': '+(says?'"'+re.source.replace(/\\(.)/g,'$1')+'" is true of the position':'the card no longer says the sentence this claim was checked for (re-check the new words against the board)'),err||(says?row.fen:txt));}
      await b.tapCt('strat-next',220);
    }
    const back=await readTac(b);await b.tapCt('strat-prev',220);const last=await readTac(b);
    L.say(back.head===STR[0].title&&last.head===STR[STR.length-1].title,g+'TC-R246d Strategy: Next past the last card comes round to the first, and Previous goes back to the last',{afterNext:back.head,afterPrev:last.head});
    L.say(b.errs.length===0,g+'TC-R246d no page error while every card was played',b.errs.slice(0,3));
    await b.close();
  }
  // ── TC-R246e: SIDEWAYS (a short phone turned, 568x320) the column beside the board has no spare height, so the line must not move anything ──
  if(!process.env.CT_G175_NO_SIDEWAYS){const g='sideways568x320 ';
    const b=await L.launch({geo:{w:568,h:320,safe:'',label:'568x320'},name:'g175-side'});await b.open();let reached=true;try{await D.states['tactics'](b);await b.settle(900);}catch(e){reached=false;}
    const rd=()=>b.page.evaluate(()=>new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const q=document.querySelector('[data-ct="tactics-board"]');const bd=q?q.getBoundingClientRect():null;
      const w=[...document.querySelectorAll('span,div')].find(e=>e.children.length===0&&getComputedStyle(e).color==='rgb(240, 162, 78)');const wr=w?w.getBoundingClientRect():null;
      let sc=w;while(sc&&!/(auto|scroll)/.test(getComputedStyle(sc).overflowY))sc=sc.parentElement;const sr=sc?sc.getBoundingClientRect():null;
      const btns=[...document.querySelectorAll('button')].filter(x=>/^(Hint|Show answer)$/.test((x.textContent||'').trim())).map(x=>{const r=x.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)].join(',');});
      const root=document.getElementById('root');
      res({board:bd?[Math.round(bd.left),Math.round(bd.top),Math.round(bd.width)].join(','):null,wrong:w?w.textContent:null,startSeen:(wr&&sr)?(wr.top>=sr.top-0.5&&wr.top<sr.bottom):null,btns:btns.join(' | '),nb:btns.length,onScreen:btns.length>0&&[...document.querySelectorAll('button')].filter(x=>/^(Hint|Show answer)$/.test((x.textContent||'').trim())).every(x=>x.getBoundingClientRect().bottom<=innerHeight+0.5),scroll:root?root.scrollHeight-root.clientHeight:null});}))));
    const s0=reached?await rd():{};
    if(L.say(reached&&s0.nb===2&&!!s0.board,g+'TC-R246e PRECONDITION Tactics is on screen sideways with its board and its Hint and Show answer buttons',s0)){
      const moved=[],unseen=[];let n=0;
      for(let i=0;i<TAC.length;i++){const row=TAC[i];const p=P(row.fen);const key=legal(p).find(m=>from(m)===row.from&&to(m)===row.to);const before=await rd();let got=null;
        for(const m of legal(p).filter(m=>!(from(m)===row.from&&to(m)===row.to)).slice(0,8)){await click(b,from(m));await click(b,to(m));const s=await rd();if(s.wrong==='Not '+san(p,m)+'. '+row.miss){got=s;break;}}
        if(got){n++;if(got.board!==before.board||got.btns!==before.btns||got.onScreen!==true||got.scroll>0)moved.push(row.motif+': board '+before.board+' -> '+got.board+', buttons '+before.btns+' -> '+got.btns+', page scroll '+got.scroll);if(got.startSeen!==true)unseen.push(row.motif);}
        await b.tapText(/^Show answer$/);await b.settle(150);await b.tapText(/^Next motif/);await b.settle(200);}
      L.say(n===TAC.length,g+'TC-R246e DENOMINATOR the card\'s own wrong-try line was shown on all '+TAC.length+' cards ('+n+')',n);
      L.say(moved.length===0,g+'TC-R246e while the line shows, the board and the Hint and Show answer buttons stay exactly where they were, on screen, and the page does not scroll',moved.slice(0,3));
      L.say(unseen.length===0,g+'TC-R246e the line starts inside its own slot (its first line is on screen; a third line scrolls inside the slot)',unseen);}
    await b.close();}
},'175-tactics-strategy-claims-hold');
