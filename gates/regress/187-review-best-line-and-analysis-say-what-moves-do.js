'use strict';
// gates/regress/187-review-best-line-and-analysis-say-what-moves-do.js - THE BEST LINE AND THE ANALYSIS BOARD SAY WHAT THE MOVES DO.
// US-R190 / TC-R264a..f.
//
// WHY [batch 14, jobs/review-sentences-name-what-the-moves-do-2026-11-12, the remainder docs/hint-audit-2026-11-12 HEX-R-05 and HEX-R-09;
// Kunal, 12 Nov 2026: "we have a few places we are giving hints explanations. We should check all of those."]: tapping the best chip showed
// the moves only ("best line 29... Qf1+ 30. Rxf1 Rxf1#") under a sentence about the move he had played, and the analysis board said
// "Analysis | 1 move in | White to play" and nothing about the move just tried. Now the sentence row says what the best line does
// (bestLineSay) while it shows, and on the analysis board what the move just tried does (anaSay).
//
// WHAT IT READS: chess.jsx through gates/engine-extract.js for the node lines (bestLineSay and anaSay over every ply of three games - the
// Opera Game, a 13-ply Alekhine Defense and a 60-ply self-played game - and, for anaSay, every legal move at every one of those positions),
// and the bundle under test (CT_APP) for the screen lines at his phone (kunal761) and at 320x568, read after stepping to the ply.
// NOT THE SAME OBJECT TWICE (CLAUDE.md, "a cross-check against a readout fed by the thing under test is not a cross-check"): every sentence
// is matched to ONE template, and what it claims is checked by THIS gate's own reading of the board - material counted square by square
// before and after the line, mate and stalemate from the rules, a mate in one found by trying every reply, the exchange on a square by this
// gate's own full minimax over every capture (not the app's least-valuable-attacker seeSq). The completeness lines go the other way: where
// the board proves a mate, a stalemate, a mate in one allowed or a free piece, the sentence must say so.
// CT_G187_NODE_ONLY=1 runs the node lines alone and SAYS so (controls; gates.sh never sets it).
const L=require('../lib');
const E=require('../engine-extract.js');
const RV=require('../drive/review');
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OPERA='e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#'.split(' ');
const ALEK='e4 Nf6 e5 Nd5 c4 Nb6 d3 e6 Nc3 Qh4 a3 Qxf2+ Kxf2'.split(' ');
const SIGN=/[+#]/;
const V={p:1,n:3,b:3,r:5,q:9,k:100};
const PN={pawn:'p',knight:'n',bishop:'b',rook:'r',queen:'q'};
const PW={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen'};
const sqRC=(sq)=>[8-(+sq[1]),'abcdefgh'.indexOf(sq[0])];
const sanOf=(g,m)=>E.toSAN(g,m,E.applyMove(g.board,m));
const bare=(s)=>String(s).replace(/[+#]$/,'');
const legal=(g,side)=>E.getLegal(side?Object.assign({},g,{turn:side,ep:null}):g);
const givesCheck=(g,m)=>{const p=E.makeMove(g,m);return E.isInCheck(p.board,p.turn);};
const mateIn1=(g)=>legal(g).filter(r=>E.getStatus(E.makeMove(g,r))==='checkmate');
// this gate's own exchange count: `side` may capture on (r,c) with ANY of its legal captures, or stop; full minimax, every attacker tried
function swap(g,r,c,side,depth){const t=g.board[r][c];if(!t||depth>12)return 0;let best=0;
  for(const m of legal(g,side)){if(m.tr!==r||m.tc!==c)continue;const g2=E.makeMove(Object.assign({},g,{turn:side,ep:null}),m);
    const v=V[t.t]-swap(g2,r,c,side==='w'?'b':'w',depth+1);if(v>best)best=v;}return best;}
// material by square count, per side and type
function count(g){const o={w:{},b:{}};for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=g.board[r][c];if(p)o[p.c][p.t]=(o[p.c][p.t]||0)+1;}return o;}
function parseList(s){const out=[];for(const part of String(s).split(' and ')){const m=/^(a|the|two|three|four|five|six|seven|eight) (pawn|knight|bishop|rook|queen)s?$/.exec(part.trim());if(!m)return null;
  const n={a:1,the:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8}[m[1]];for(let i=0;i<n;i++)out.push(PN[m[2]]);}return out.sort().join('');}
function selfPlay(fen,n){let g=E.fromFEN(fen);const out=[];for(let i=0;i<n;i++){const st=E.getStatus(g);if(st==='checkmate'||st==='stalemate')break;let m=null;try{m=E.bestMove(g,2,0);}catch(e){}if(!m)break;out.push(sanOf(g,m));g=E.makeMove(g,m);}return out;}
function gamePositions(sans){let g=E.fromFEN(START);const st=[g],mv=[];for(const s of sans){const m=E.findMoveBySAN(g,s);if(!m)break;mv.push(m);g=E.makeMove(g,m);st.push(g);}return {st,mv};}
// ── bestLineSay, checked against the board ─────────────────────────────────────────────────────────────────────────────────────────────
const B_MATE1=/^Best was (\S+), and it is mate\.$/;
const B_HEAD=/^Best was (\S+?)( with check)?(?:: it (is )?([^.]+))?\.(?: (.+))?$/;
const B_TAIL=[/^The line ends in mate: (\S+) mate\.$/,/^The line ends in stalemate\.$/,/^The queens come off\.$/,/^The queens come off and the line (wins|gives up) (?:material: )?(.+?)(?: for (.+))?\.$/,/^The line (wins|gives up) (?:material: )?(.+?)(?: for (.+))?\.$/,/^Material stays even\.$/];
function checkBest(states,moves){const errs=[];const s=E.bestLineSay(states,moves);const k=moves.length,g0=states[0],me=g0.turn,them=me==='w'?'b':'w';
  if(SIGN.test(s))errs.push('a + or # sign');
  const s0=sanOf(g0,moves[0]);
  const m1=B_MATE1.exec(s);if(m1){if(E.getStatus(states[1])!=='checkmate')errs.push('says the first move mates and it does not');if(m1[1]!==bare(s0))errs.push('names '+m1[1]+' for '+s0);return {s,errs};}
  if(E.getStatus(states[1])==='checkmate')errs.push('the first move mates and the sentence does not say so');
  const h=B_HEAD.exec(s);if(!h){errs.push('matches no template');return {s,errs};}
  if(h[1]!==bare(s0))errs.push('names '+h[1]+' for '+s0);
  const chkW=!!h[2]||/check/.test(h[4]||'');if(chkW!==givesCheck(g0,moves[0]))errs.push('check said '+chkW+', the move gives check '+givesCheck(g0,moves[0]));
  if(/\b(takes|wins) the (\w+) on ([a-h][1-8])/.test(h[4]||'')){const q=/\b(takes|wins) the (\w+) on ([a-h][1-8])/.exec(h[4]);const [r,c]=sqRC(q[3]);const t=g0.board[r][c];if(!t||PW[t.t]!==q[2]||moves[0].tr!==r||moves[0].tc!==c)errs.push('the first move does not take the '+q[2]+' on '+q[3]);}
  const tail=h[5]||'';const last=states[k],stL=E.getStatus(last);
  const lm=moves[k-1],lastCap=!!(states[k-1].board[lm.tr][lm.tc]||lm.epCap);
  const c0=count(g0),c1=count(last);const lost=(side)=>{let o='';for(const t of 'pnbrq'){const d=(c0[side][t]||0)-(c1[side][t]||0);for(let i=0;i<d;i++)o+=t;}return o;};
  const promo=moves.some(m=>m.promo);let lt=lost(them).split(''),lm2=lost(me).split('');const qOff=lt.indexOf('q')>=0&&lm2.indexOf('q')>=0;
  for(let i=lt.length-1;i>=0;i--){const j=lm2.indexOf(lt[i]);if(j>=0){lm2.splice(j,1);lt.splice(i,1);}}
  const val=(a)=>a.reduce((x,t)=>x+V[t],0);const net=val(lt)-val(lm2);const anyCap=moves.some((m,i)=>states[i].board[m.tr][m.tc]||m.epCap);
  let ti=-1,tm=null;for(let i=0;i<B_TAIL.length;i++){const x=B_TAIL[i].exec(tail);if(x){ti=i;tm=x;break;}}
  if(tail&&ti<0)errs.push('tail "'+tail+'" matches no template');
  if(stL==='checkmate'){if(ti!==0)errs.push('the line ends in mate and the sentence does not say so');else if(tm[1]!==bare(sanOf(states[k-1],lm)))errs.push('names '+tm[1]+' as the mate');}
  else if(ti===0)errs.push('says the line ends in mate and it does not');
  if(stL==='stalemate'){if(ti!==1)errs.push('stalemate not said');}else if(ti===1)errs.push('says stalemate and it is not');
  if(stL!=='checkmate'&&stL!=='stalemate'&&!promo){
    if(lastCap){if(ti>=2)errs.push('a material tail on a line whose last move is a capture');}
    else if(anyCap){
      if(ti<2)errs.push('captures in the line and no word on the material');
      else{const said=(ti===2||ti===3)?true:false;if(said!==qOff)errs.push('queens come off said '+said+', counted '+qOff);
        if(ti===5&&(net!==0||qOff))errs.push('material stays even said, net '+net);
        if(ti===2&&net!==0)errs.push('queens off with net '+net+' and no material word');
        if(ti===3||ti===4){const win=tm[1]==='wins';const A=parseList(tm[2]),Bl=tm[3]?parseList(tm[3]):'';
          const exp=win?[lt.slice().sort().join(''),lm2.slice().sort().join('')]:[lm2.slice().sort().join(''),lt.slice().sort().join('')];
          if(win!==(net>0))errs.push((win?'wins':'gives up')+' said, net '+net);
          if(A!==exp[0]||(Bl||'')!==exp[1])errs.push('names '+tm[2]+(tm[3]?' for '+tm[3]:'')+', counted '+exp[0]+' for '+exp[1]);}}}
    else if(ti>=2)errs.push('a material tail with no capture in the line');}
  return {s,errs};}
// ── anaSay, checked against the board ─────────────────────────────────────────────────────────────────────────────────────────────────
const A_MATE=/^(\S+) is checkmate\.$/,A_STALE=/^(\S+) is stalemate: (White|Black) has no legal move\.$/,A_ALLOW=/^(\S+)( gives check but)? allows (\S+) mate\.$/;
const A_LETS=/^(\S+)(?: takes the (pawn|knight|bishop|rook|queen), but it)? lets (\S+) win material: it takes the (pawn|knight|bishop|rook|queen) on ([a-h][1-8])( for nothing)?(, with check)?\.$/;
const A_BACK=/^(\S+) takes the (pawn|knight|bishop|rook|queen) on ([a-h][1-8])(, with check)?, and (\S+) can take back\.$/;
const A_READ=/^(\S+) (.+)\.$/;
function checkAna(pre,mv){const errs=[];const s=E.anaSay(pre,mv);const post=E.makeMove(pre,mv);const S=sanOf(pre,mv),N=bare(S),chk=givesCheck(pre,mv);
  const me=pre.turn,them=me==='w'?'b':'w';const st=E.getStatus(post);const m1=(st==='checkmate'||st==='stalemate')?[]:mateIn1(post);
  const capd=pre.board[mv.tr][mv.tc]||(mv.epCap?{t:'p'}:null);const gain=capd?V[capd.t]:0;
  if(SIGN.test(s))errs.push('a + or # sign');
  const which=[A_MATE,A_STALE,A_ALLOW,A_LETS,A_BACK].map(r=>r.exec(s));const nT=which.filter(Boolean).length;
  if(nT>1)errs.push('matches '+nT+' templates');
  const [mt,stl,al,le,bk]=which;
  for(const x of which)if(x&&x[1]!==N)errs.push('names '+x[1]+' for '+S);
  if((st==='checkmate')!==!!mt)errs.push('checkmate '+st+' but said '+!!mt);
  if((st==='stalemate')!==!!stl)errs.push('stalemate '+st+' but said '+!!stl);
  if(stl&&stl[2]!==(them==='w'?'White':'Black'))errs.push('the wrong side has no move');
  if((m1.length>0)!==!!al)errs.push('a mate in one allowed: '+m1.length+' replies, said '+!!al);
  if(al){const r=legal(post).find(x=>bare(sanOf(post,x))===al[3]);if(!r||E.getStatus(E.makeMove(post,r))!=='checkmate')errs.push(al[3]+' is not a mating reply');if(!!al[2]!==chk)errs.push('gives check said '+!!al[2]);}
  if(le){const r=legal(post).find(x=>bare(sanOf(post,x))===le[3]);
    if(!r)errs.push(le[3]+' is not a legal reply');else{const [rr,rc]=sqRC(le[5]);const t=post.board[rr][rc];
      if(r.tr!==rr||r.tc!==rc||!t||t.c!==me||PW[t.t]!==le[4])errs.push(le[3]+' does not take the '+le[4]+' on '+le[5]);
      else{const g4=E.makeMove(post,r);const net=V[t.t]-swap(g4,rr,rc,me,0);if(net-gain<1)errs.push('says they win material: own exchange count '+net+' less '+gain+' taken');
        const back=legal(g4).some(x=>x.tr===rr&&x.tc===rc);if(!!le[6]===back)errs.push('for nothing said '+!!le[6]+', a take-back exists '+back);
        if(!!le[7]!==givesCheck(post,r))errs.push('the reply\'s check said '+!!le[7]);
        if(mateIn1(g4).length)errs.push('the capture walks into a mate in one and is called a loss');}}
    if(chk)errs.push('says a check loses material');
    if(!!le[2]!==!!capd||(le[2]&&PW[capd.t]!==le[2]))errs.push('the move\'s own capture misread');}
  if(bk){const [rr,rc]=sqRC(bk[3]);if(!capd||mv.tr!==rr||mv.tc!==rc||PW[capd.t]!==bk[2])errs.push('does not take the '+bk[2]+' on '+bk[3]);
    const r=legal(post).find(x=>bare(sanOf(post,x))===bk[5]);if(!r||r.tr!==rr||r.tc!==rc)errs.push(bk[5]+' does not take back on '+bk[3]);if(!!bk[4]!==chk)errs.push('with check said '+!!bk[4]);}
  if(!nT&&s){const rd=A_READ.exec(s);if(!rd||rd[1]!==N)errs.push('matches no template');else if(chk&&!/check/.test(rd[2]))errs.push('a check not said');
    if(/\b(allows|win material|can take back|checkmate|stalemate)\b/.test(rd?rd[2]:''))errs.push('a reading worded like a verdict it is not');}
  if(!s&&chk)errs.push('a check with no sentence');
  // completeness: a free piece left (no take-back, this gate's own count, not a check, no mate in one for the mover after it) must be said
  if(st!=='checkmate'&&st!=='stalemate'&&!m1.length&&!chk&&!le){for(const r of legal(post)){const t=post.board[r.tr][r.tc];if(!t||t.c!==me||t.t==='k')continue;const g4=E.makeMove(post,r);
    if(legal(g4).some(x=>x.tr===r.tr&&x.tc===r.tc))continue;if(V[t.t]-gain<2)continue;if(mateIn1(g4).length)continue;errs.push('leaves the '+PW[t.t]+' on '+E.rc2sq(r.tr,r.tc)+' free to '+sanOf(post,r)+' and does not say so');break;}}
  return {s,errs,kind:mt?'mate':stl?'stalemate':al?'allows':le?'lets':bk?'back':s?'read':'none'};}
L.run(async()=>{
  L.note('187: chess.jsx '+E.SRC_PATH+' md5 '+E.SOURCE_MD5);
  const N='node ';
  // ── TC-R264a the three lines of the audit, word for word (each checked by hand against the board: see the job's old/new file) ──
  const AUD=[['r4rk1/7p/2p1p1pQ/P3B3/1P1P4/2P5/5qPP/2R4K b - - 0 1','Qf1+ Rxf1 Rxf1#','Best was Qf1 with check. The line ends in mate: Rxf1 mate.'],
    ['4rrk1/Q1pq2pp/4p3/4B3/PP1P4/2P5/5PPP/R5K1 w - - 0 1','Qxc7 Qf7 Qxf7+ Rxf7 Bd6','Best was Qxc7: it wins the pawn. The queens come off and the line wins a pawn.'],
    ['rn2kb1r/p3qppp/2p2n2/1N2p1B1/2B1P3/1Q6/PPP2PPP/R3K2R b KQkq - 0 1','Qb4+ Qxb4 Bxb4+ c3','Best was Qb4 with check. The queens come off.']];
  const kindsB0={};
  for(const [f,l,want] of AUD){let g=E.fromFEN(f);const st=[g],mv=[];for(const s of l.split(' ')){const m=E.findMoveBySAN(g,s);mv.push(m);g=E.makeMove(g,m);st.push(g);}
    const r=checkBest(st,mv);{const tl=/ (The .*|Material stays even\.)$/.exec(r.s);if(tl)kindsB0[tl[1].replace(/: \S+ mate\./,': X mate.').replace(/(wins|gives up) .*/,'$1 ...')]=1;}L.say(r.s===want&&!r.errs.length,N+'TC-R264a the best line '+l+' reads "'+want+'" - "'+r.s+'"'+(r.errs.length?' ('+r.errs.join('; ')+')':''));}
  // ── the corpus: every ply of three games ──
  const games=[['Opera',OPERA],['Alekhine',ALEK],['self-play',selfPlay(START,60)]];
  let nB=0,badB=[],kindsB=Object.assign({},kindsB0);let nA=0,badA=[],kindsA={};
  for(const [nm,sans] of games){const {st,mv}=gamePositions(sans);
    // TC-R264b: bestLineSay over the game's own next 1..5 moves from every ply (a line is any legal sequence; the sentence's claims are about it)
    for(let i=0;i<mv.length;i++)for(let k=1;k<=5&&i+k<=mv.length;k++){const r=checkBest(st.slice(i,i+k+1),mv.slice(i,i+k));nB++;
      const tl=/ (The .*|Material stays even\.)$/.exec(r.s);const key=B_MATE1.test(r.s)?'mate-first':tl?tl[1].replace(/: \S+ mate\./,': X mate.').replace(/(wins|gives up) .*/,'$1 ...'):'head only';kindsB[key]=(kindsB[key]||0)+1;
      if(r.errs.length&&badB.length<6)badB.push(nm+' ply '+(i+1)+' +'+k+': "'+r.s+'" '+r.errs.join('; '));else if(r.errs.length)badB.push('');}
    // TC-R264c: anaSay over EVERY legal move at every position of the game
    for(let i=0;i<st.length;i++){const g=st[i];const s=E.getStatus(g);if(s==='checkmate'||s==='stalemate')continue;
      for(const m of legal(g)){const r=checkAna(g,m);nA++;kindsA[r.kind]=(kindsA[r.kind]||0)+1;if(r.errs.length&&badA.length<8)badA.push(nm+' pos '+i+' '+sanOf(g,m)+': "'+r.s+'" '+r.errs.join('; '));else if(r.errs.length)badA.push('');}}}
  L.say(nB>=200&&badB.length===0,N+'TC-R264b bestLineSay over '+nB+' lines (every ply of 3 games, 1 to 5 moves long): every sentence matches one template and every claim holds on the board ('+badB.length+' wrong'+(badB.length?': '+badB.filter(Boolean).join(' | '):'')+')');
  L.say(Object.keys(kindsB).length>=5&&(kindsB['The line ends in mate: X mate.']||0)>0&&(kindsB['The queens come off.']||0)+(kindsB['The queens come off and the line wins ...']||0)>0&&Object.keys(kindsB).some(k=>/^The line wins/.test(k)),N+'TC-R264b the corpus reaches the mate tail, the queens-off tail and a material tail, so each branch was read (the three audit lines counted in; '+JSON.stringify(kindsB)+')');
  L.say(nA>=1500&&badA.length===0,N+'TC-R264c anaSay over '+nA+' moves (every legal move at every position of 3 games): every sentence matches one template, every claim holds by this gate\'s own count, and every mate, stalemate, mate in one allowed and free piece is said ('+badA.length+' wrong'+(badA.length?': '+badA.filter(Boolean).join(' | '):'')+')');
  L.say(['mate','allows','lets','back','read'].every(k=>(kindsA[k]||0)>0),N+'TC-R264c every kind of analysis sentence occurs in the corpus, so none passes over nothing ('+JSON.stringify(kindsA)+')');
  // a stalemate, which no game above reaches
  {const g=E.fromFEN('7k/8/6Q1/8/8/8/8/K7 w - - 0 1');const m=E.findMoveBySAN(g,'Qf7');const r=checkAna(g,m);L.say(r.s==='Qf7 is stalemate: Black has no legal move.'&&!r.errs.length,N+'TC-R264c a stalemate is said as one - "'+r.s+'"');}
  if(process.env.CT_G187_NODE_ONLY){L.note('CT_G187_NODE_ONLY=1: the screen lines were NOT run');L.done();return;}
  // ── TC-R264d..f ON THE SCREEN: the Opera Game, at his phone and at 320x568 ──
  const rd=(b)=>b.page.evaluate(()=>{const t=document.querySelector('[data-ct="rev-why-txt"]');const bl=document.querySelector('[data-ct="rev-bestline"]');
    let fit=null;if(t){const cs=getComputedStyle(t);fit={sh:t.scrollHeight,ch:t.clientHeight,clamp:+cs.webkitLineClamp||0,lh:parseFloat(cs.lineHeight)||0};}
    return {txt:t?t.textContent:null,say:t?t.getAttribute('data-say'):null,bl:bl?(bl.innerText||'').replace(/\s+/g,' ').trim():null,fit};});
  const fits=(f)=>!!f&&(f.sh<=f.ch+0.5||(!!f.clamp&&f.ch<=Math.ceil(f.clamp*f.lh)+1));
  for(const geo of ['kunal761','se']){const G=geo+' ';
    const b=await L.launch({geo,store:{ct_pool:'3'},name:'g187-'+geo});await b.open();let ok=true;
    try{await RV.importPgn(b,RV.PGN_OPERA,240000);await RV.startReview(b);}catch(e){ok=false;}
    L.say(ok,G+'TC-R264d PRECONDITION the Opera Game is reviewed and its move screen is open');
    if(ok){
      // TC-R264d the best line: 10...cxb5, best chip tapped
      await RV.goPly(b,20);await b.settle(500);const before=await rd(b);const bd0=await b.board();
      let tapped=true;try{await b.tapCt('rev-best');}catch(e){tapped=false;}await b.settle(3500);const af=await rd(b);const bd1=await b.board();
      L.say(tapped&&before.say===null&&/slip/.test(before.txt||''),G+'TC-R264d PRECONDITION at ply 20 the row says the played move\'s sentence first and the best chip is there - "'+before.txt+'"');
      // the line on screen, replayed by this gate: the sentence's claims are checked against THAT line, not a stored string
      let chk={s:'',errs:['no line row']};const ml=/^best line (.+)$/.exec(af.bl||'');
      if(ml){let g=E.fromFEN('rn2kb1r/p3qppp/2p2n2/1N2p1B1/2B1P3/1Q6/PPP2PPP/R3K2R b KQkq - 0 11');const st=[g],mv=[];for(const tok of ml[1].split(' ')){if(/^\d+\.+$/.test(tok))continue;const m=E.findMoveBySAN(g,tok.replace(/^\d+\.+/,''));if(!m)break;mv.push(m);g=E.makeMove(g,m);st.push(g);}
        if(mv.length)chk=checkBest(st,mv);}
      L.say(af.say==='best'&&af.txt===chk.s&&/^Best was Qb4 with check\./.test(af.txt||'')&&!chk.errs.length,G+'TC-R264d with the best line showing ("'+af.bl+'") the row says what it does, and this gate\'s replay of that line agrees - "'+af.txt+'"'+(chk.errs.length?' ('+chk.errs.join('; ')+')':''));
      L.say(fits(af.fit)&&!!bd0&&!!bd1&&Math.abs(bd0.y-bd1.y)<0.5&&Math.abs(bd0.w-bd1.w)<0.5,G+'TC-R264d the sentence fits its box or is cut by its clamp only, and the board did not move ('+(bd0&&bd0.y)+'/'+(bd0&&bd0.w)+' -> '+(bd1&&bd1.y)+'/'+(bd1&&bd1.w)+')',af.fit);
      if(geo==='kunal761'){let sh=null;try{await b.tapCt('rev-why-txt');await b.settle(500);sh=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-why-sheet"]');return e?e.innerText:null;});}catch(e){}
        L.say(!!sh&&/small slip/.test(sh),G+'TC-R264d the played move\'s sentence is one tap away: the row opens the sheet with it - "'+String(sh).slice(0,80)+'"');
        if(sh){await b.page.mouse.click(8,8);await b.settle(300);}
        if(process.env.CT_G187_SHOT)await b.shot(process.env.CT_G187_SHOT+'-best');}
      // TC-R264e the analysis board: from ply 27 (14.Rd1), Analyze, then 14...Qe6 and 15.Bxd7+, then Undo
      await RV.goPly(b,27);await b.settle(500);const bdA=await b.board();
      let inA=true;try{await b.tapCt('rev-fab');await b.settle(900);}catch(e){inA=false;}
      const a0=await rd(b);
      await b.move('e7','e6');await b.settle(1200);const a1=await rd(b);const bdB=await b.board();
      if(geo==='kunal761'&&process.env.CT_G187_SHOT)await b.shot(process.env.CT_G187_SHOT+'-analysis');
      await b.move('b5','d7');await b.settle(1200);const a2=await rd(b);
      let ud=true;try{await b.tapText(/Undo$/);await b.settle(700);}catch(e){ud=false;}const a3=await rd(b);
      L.say(inA&&a0.say==='ana'&&/^\s*$/.test(a0.txt||''),G+'TC-R264e PRECONDITION the analysis board opened, its sentence row is there and empty before a move ("'+a0.txt+'")');
      const pq=E.fromFEN('4kb1r/p2rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 0 14');const mq=E.findMoveBySAN(pq,'Qe6');const cq=checkAna(pq,mq);
      L.say(a1.txt===cq.s&&cq.kind==='lets'&&!cq.errs.length&&a1.txt==='Qe6 lets Bxd7 win material: it takes the rook on d7, with check.',G+'TC-R264e after 14...Qe6 the row says the rook on d7 is lost to Bxd7, and this gate\'s own count agrees - "'+a1.txt+'"'+(cq.errs.length?' ('+cq.errs.join('; ')+')':''));
      const pb=E.makeMove(pq,mq);const mb=E.findMoveBySAN(pb,'Bxd7+');const cb=checkAna(pb,mb);
      L.say(a2.txt===cb.s&&cb.kind==='back'&&!cb.errs.length,G+'TC-R264e after 15.Bxd7+ the row says what it takes and the take-back - "'+a2.txt+'"'+(cb.errs.length?' ('+cb.errs.join('; ')+')':''));
      L.say(ud&&/^\s*$/.test(a3.txt||'')&&a3.say==='ana',G+'TC-R264e after Undo the row is empty again (the move it described is gone) - "'+a3.txt+'"');
      L.say(fits(a1.fit)&&!!bdA&&!!bdB&&Math.abs(bdA.y-bdB.y)<0.5&&Math.abs(bdA.w-bdB.w)<0.5,G+'TC-R264e the analysis sentence fits its box or its clamp, and the board did not move entering analysis and playing a move ('+(bdA&&bdA.y)+'/'+(bdA&&bdA.w)+' -> '+(bdB&&bdB.y)+'/'+(bdB&&bdB.w)+')',a1.fit);
      // TC-R264f a mate on the analysis board: from ply 32 (16...Nxb8), Rd8
      await RV.exitAnalysis(b);await RV.goPly(b,32);await b.settle(500);
      try{await b.tapCt('rev-fab');await b.settle(900);await b.move('d1','d8');await b.settle(1200);}catch(e){}
      const a4=await rd(b);L.say(a4.say==='ana'&&a4.txt==='Rd8 is checkmate.',G+'TC-R264f after 17.Rd8 on the analysis board the row says it is checkmate - "'+a4.txt+'"');
    }
    await b.close();}
  L.done();
});
