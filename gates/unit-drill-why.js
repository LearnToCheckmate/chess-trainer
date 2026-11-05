const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','chess.jsx'),'utf8');
function grab(name){
  const i=src.indexOf('function '+name+'(');
  if(i<0)throw new Error('not found '+name);
  let d=0,j=src.indexOf('{',i);let k=j;
  for(;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(d===0)break;}}
  return src.slice(i,k+1);
}
let MOT=[];let BOARD=null;
global.moveMotifs=(pos,mv)=>MOT;
let SEE=0;                 // what the opponent wins by taking on the destination
const _mk=(p,m)=>({...p});
const _opp=(t)=>t==='w'?'b':'w';
const WMAX=+(/const WHY_DRILL_MAXW=(\d+);/.exec(src)||[])[1];
if(!WMAX)throw new Error('WHY_DRILL_MAXW not found in chess.jsx');
const code=grab('whyBand')+'\n'+grab('whyShape')+'\nconst WHY_DRILL_MAXW='+WMAX+';\n'+grab('mistakeWhy')+'\n'+grab('mistakeHint')+'\nmodule.exports={whyBand,whyShape,mistakeWhy,mistakeHint};';
const m={exports:{}};
new Function('module','moveMotifs','makeMove','opp','seeSq',code)(m,(p,v)=>MOT,_mk,_opp,()=>SEE);
const {whyBand,mistakeWhy,mistakeHint}=m.exports;

let fails=0;const eq=(a,b,n)=>{const ok=a===b;if(!ok){fails++;console.log('  FAIL',n,'\n    got     ',JSON.stringify(a),'\n    expected',JSON.stringify(b));}else console.log('  ok  ',n,'->',JSON.stringify(a));};

console.log('--- whyBand, both signs, every boundary ---');
[[0,'level'],[0.49,'level'],[-0.49,'level'],[0.5,'slightly better'],[-0.5,'slightly worse'],
 [1.49,'slightly better'],[1.5,'clearly better'],[-1.5,'clearly worse'],[2.99,'clearly better'],
 [3,'winning'],[-3,'losing'],[5.99,'winning'],[6,'completely winning'],[-6,'completely losing'],
 [99,'completely winning'],[-99,'completely losing']].forEach(([v,w])=>eq(whyBand(v),w,'whyBand('+v+')'));

const pos={board:Array.from({length:8},()=>Array(8).fill(null)),turn:'b'};
const mvEmpty={fr:6,fc:4,tr:4,tc:1};          // target empty
const posCap={board:Array.from({length:8},()=>Array(8).fill(null)),turn:'b'};
posCap.board[4][1]={t:'n',c:'w'};
const mvCap={fr:6,fc:4,tr:4,tc:1};

console.log('\n--- mistakeWhy: the frame. Black losing must NOT read "winning" ---');
MOT=[];
// White-frame +4.0 -> +5.5 : White is winning, BLACK played the move
eq(mistakeWhy(pos,mvEmpty,'Qb4+','cxb5',4.0,5.5,'b'),'Qb4+ was stronger. cxb5 left you losing.','black, same band, white-frame positive');
eq(mistakeWhy(pos,mvEmpty,'Qb4+','cxb5',4.0,5.5,'w'),'Qb4+ was stronger. cxb5 left you winning.','white, same band');
console.log('\n--- crossing a boundary names BOTH bands ---');
// #426: AT THE SHIPPED BUDGET (52) THE BAND PAIR USUALLY DOES NOT FIT. Measured over 6400 combinations
// through this very function: 92.4% name ONE band, 24.2% lose the reason clause. That is the 74px verdict box
// talking, not the sentence design - "went from clearly better to level" is 57 characters on its own. The
// residual is filed as jobs/drill-verdict-box-cannot-hold-the-agreed-two-clause-sentence-2026-09-28 and its
// fix is Kunal's already-given answer for this screen (the solved card gives the goal row its space).
// These two assert what actually ships, so a future budget lift shows up here as a red rather than a surprise.
// #548 item (102) IS THAT LIFT: since #547's 'float' (Kunal, questions/drill-verdict-float-or-slot-2026-10-10) the verdict is no
// longer a 74px slot - it floats over the goal card, which has no job once solved, and a long one runs down over the board in
// full (his 22 Sep answer answers/bench-puzzles-solved-explanation). So the budget is 72 and the band pair is what ships.
eq(mistakeWhy(pos,mvEmpty,'Rf3','Qxh3',2.0,0.2,'w'),'Rf3 was stronger. Qxh3 went from clearly better to level.','white, crossing, BOTH bands named at the #548 budget of 72');
eq(mistakeWhy(pos,mvEmpty,'Rf3','Qxh3',-2.0,-0.2,'b'),'Rf3 was stronger. Qxh3 went from clearly better to level.','black frame mirrors it');
// the band pair DOES survive when the words are short enough, which is the 7.6% case:
// AND THE ORDERING IS A DELIBERATE CHOICE, PINNED HERE. cands is [shape+pair, shape+one, bare+pair, bare+one],
// so a sentence that can afford the REASON with one band is preferred over one that drops the reason to show
// both bands. That is antagonist A's 4b applied, and it is WHY the measured band-pair rate is only 7.6%:
// "Rf3 was stronger. Qxh3 went from level to clearly better." is 57 characters and the budget is 52, while
// "Rf3 was stronger. Qxh3 left you clearly better." is 46 and fits. The reason wins.
eq(mistakeWhy(pos,mvEmpty,'Rf3','Qxh3',-0.2,-2.0,'b'),'Rf3 was stronger. Qxh3 went from level to clearly better.','the REASON and the band pair BOTH fit at 72 - the two-clause sentence Kunal agreed on 2026-09-20');
console.log('\n--- motifs come from the BEST move, and a capture is named as material ---');
MOT=['fork'];   eq(mistakeWhy(pos,mvEmpty,'Nd5','Qxc2',1.0,0.1,'w'),'Nd5 forks two pieces. Qxc2 went from slightly better to level.','fork clause with the band pair (both clauses survive at 72)');
MOT=['mate'];   eq(mistakeWhy(pos,mvEmpty,'Rd8','Kh8',8.0,7.0,'w'),'Rd8 forces mate. Kh8 left you completely winning.','mate clause');
MOT=[];         eq(mistakeWhy(posCap,mvCap,'Qxd7','Nxd7',7.0,9.0,'b'),'Qxd7 wins material. Nxd7 left you completely losing.','capture clause, black');
console.log('\n--- no engine units ever leak (NC3 shape) ---');
const all=[mistakeWhy(pos,mvEmpty,'Qb4+','cxb5',4.0,5.5,'b'),mistakeWhy(posCap,mvCap,'Qxd7','Nxd7',7.0,9.0,'b')];
all.forEach((w,i)=>eq(/centipawn|\bcpl?\b|[+-]\d+\.\d/i.test(w),false,'no engine units ['+i+']'));
console.log('\n--- the budget: longest realistic sentence still fits 70 ---');
MOT=['discovered check'];
const worst=mistakeWhy(pos,mvEmpty,'Qxb7+','Qxc2+',7.0,-7.0,'w');
console.log('   worst:',JSON.stringify(worst),'len',worst.length);
eq(worst.length<=WMAX,true,'worst case <= WHY_DRILL_MAXW ('+WMAX+')');
eq(worst.indexOf('Qxc2+')>=0,true,'the comparison survives the budget (played move still named)');
// #426 antagonist A, 4b: the REASON must survive the budget, not only the arithmetic. The old cands order
// dropped the shape first and 33.9% of 8100 enumerated combinations came out with no reason clause at all.
// #426 antagonist A, 4b. The cands order now shortens the COMPARISON before it drops the REASON, so the
// reason survives wherever it can. It cannot always: on the longest band words the whole shape is spent, and
// the MEASURED rate is 24.2% of 6400 combinations (was 33.9% at the old budget of 70 with the old order).
// This asserts the invariant that always holds - the better move and at least one band are always named -
// and the long-band case is pinned below so the trade-off is visible rather than implied.
eq(/Qxb7\+/.test(worst)&&/completely losing/.test(worst),true,'the worst case still names the better move AND a band');
MOT=['fork'];
const shortBands=mistakeWhy(pos,mvEmpty,'Nd5','Qxc2',1.0,0.1,'w');
eq(/forks two pieces/.test(shortBands),true,'with short band words the REASON survives (A 4b: the old order spent this first)');
console.log('\n--- degenerate inputs return empty, never a half sentence ---');
eq(mistakeWhy(pos,mvEmpty,'','cxb5',1,2,'b'),'','no bestSan');
eq(mistakeWhy(pos,mvEmpty,'Qb4+','',1,2,'b'),'','no playedSan');
eq(mistakeWhy(pos,null,'Qb4+','cxb5',undefined,undefined,'b'),'','null bestMove AND no evalAfter -> no sentence, never a fabricated band');
eq(mistakeWhy(pos,null,'Qb4+','cxb5',undefined,4.0,'b'),'Qb4+ was stronger. cxb5 left you losing.','null bestMove with a real evalAfter still yields a sentence (White-frame +4 = Black losing)');
console.log('\n--- hints: shape, not move; and the quiet case does not misdirect ---');
MOT=['mate'];eq(mistakeHint(pos,mvEmpty),'There is a forcing line here, and it ends the game.','mate hint');
MOT=['fork'];eq(mistakeHint(pos,mvEmpty),'One move can hit two things at once.','fork hint');
MOT=[];eq(mistakeHint(pos,mvEmpty),'No tactic to spot here \u2014 look for the move that improves your worst piece.','quiet hint does not say "forcing"');
MOT=[];eq(mistakeHint(posCap,mvCap),'There is material to be taken here.','capture hint');
MOT=[];eq(/forcing/.test(mistakeHint(pos,mvEmpty)),false,'quiet hint contains no "forcing"');
const hints=[mistakeHint(pos,mvEmpty),mistakeHint(posCap,mvCap)];
eq(new Set(hints).size,2,'two different shapes give two different hints');
console.log('\n--- the mistakes pool cap: practised first, then oldest [#548 item (132), Kunal\'s default B8-SMALL-DEFAULTS (2)] ---');
{const cm={exports:{}};new Function('module',grab('capMistakes')+'\nmodule.exports=capMistakes;')(cm);const capMistakes=cm.exports;
 const mk=(n,pr)=>Array.from({length:n},(_,i)=>({fen:'F'+i,...(pr&&pr(i)?{practisedAt:1}:{})}));   // index 0 is the newest
 const base=mk(150,i=>i>=40&&i<50);                                  // ten practised entries in the middle of a full pool
 const add5=[...mk(5).map(x=>({fen:'N'+x.fen})),...base];
 const r5=capMistakes(add5,150);
 eq(r5.length,150,'cap: five new captures over a full pool keep it at 150');
 eq(r5.filter(x=>/^NF/.test(x.fen)).length,5,'cap: all five new captures are kept');
 eq(r5.filter(x=>x.practisedAt).length,5,'cap: the five dropped are practised ones (ten practised before, five after)');
 eq(base.filter(x=>!x.practisedAt).every(x=>r5.some(y=>y.fen===x.fen)),true,'cap: no UNPRACTISED entry is dropped while a practised one remains');
 eq(r5.some(x=>x.fen==='F149'),true,'cap: the oldest unpractised entry (the tail) survives when practised ones can go instead - the old .slice(0,150) dropped it');
 const add20=[...mk(20).map(x=>({fen:'N'+x.fen})),...base];
 const r20=capMistakes(add20,150);
 eq(r20.length,150,'cap: twenty new over a full pool keep it at 150');
 eq(r20.filter(x=>x.practisedAt).length,0,'cap: all ten practised entries go first');
 eq(r20.filter(x=>/^F/.test(x.fen)&&!r20.some(()=>false)).length,130,'cap: then the ten OLDEST unpractised go (130 of the 140 left)');
 eq(r20.some(x=>x.fen==='F139')&&!r20.some(x=>x.fen==='F149')&&!r20.some(x=>x.fen==='F140'),true,'cap: the ones dropped after the practised are the tail - F140 to F149 - and F139 stays');
 eq(capMistakes(mk(10),150).length,10,'cap: a pool under the cap is returned unchanged');}
console.log('\n--- #548 item (114): the engine line in plain words (explainLine, evalWords), on the REAL chess helpers ---');
// The functions above are lifted out with stubs; explainLine reads the board through moveMotifs, moveGist and the move generator, so it
// is tested on the real code: chess.jsx is bundled for node with esbuild (React stubbed - nothing here renders) and the three functions
// are exported from the bundle. The golden case is the job's own fixture and Kunal's reference reading of its row 2.
{const os=require('os'),path=require('path'),cp=require('child_process');
 const d=fs.mkdtempSync(path.join(os.tmpdir(),'ct-ew-'));
 fs.writeFileSync(path.join(d,'c.jsx'),src+'\nexport {explainLine,evalWords,parsePGN,loadSANs,toFEN};\n');
 fs.writeFileSync(path.join(d,'react.js'),'module.exports={useState:()=>[null,()=>{}],useMemo:f=>f(),useRef:()=>({}),useEffect:()=>{},useLayoutEffect:()=>{},memo:x=>x,useCallback:f=>f};');
 let M=null;
 try{cp.execFileSync(path.join(__dirname,'node_modules','.bin','esbuild'),[path.join(d,'c.jsx'),'--bundle','--platform=node','--format=cjs','--alias:react='+path.join(d,'react.js'),'--outfile='+path.join(d,'c.cjs'),'--log-level=error']);
   global.window={location:{search:'',hostname:'x',href:'x'},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),navigator:{},CTLESSONS:new Proxy({},{get:()=>[]})};
   global.document={addEventListener(){},createElement:()=>({}),querySelector:()=>null};global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};global.sessionStorage=global.localStorage;global.self=global.window;
   if(!global.navigator)try{global.navigator={userAgent:'node',hardwareConcurrency:2};}catch(e){}
   M=require(path.join(d,'c.cjs'));}catch(e){console.log('  bundle error:',String(e.message||e).slice(0,200));}
 eq(!!(M&&M.explainLine&&M.evalWords),true,'explainLine and evalWords load from the real chess.jsx');
 if(M){
  const FEN='3k4/ppp1b2p/8/5b2/3N1B2/2N5/PP3prP/2K4R w - - 0 22';
  const r2=M.explainLine(FEN,['f4e3','f5d3','d4e2','f2f1q'],4);
  eq(r2.map(x=>x.san).join(' '),'22.Be3 Bd3 23.Nde2 f1=Q+','golden: the line is numbered from the FEN');
  eq(r2[0].why,'hits the pawn on f2','golden 22.Be3: attacks the f2 pawn (reference: "attacks the f2 pawn")');
  eq(r2[1].why,'aims at f1, where the f-pawn queens','golden 22...Bd3: aims at f1 (reference: "aims through e2 at f1")');
  eq(r2[2].why,'blocks the bishop on d3','golden 23.Nde2: blocks that diagonal (reference: "blocks that diagonal")');
  eq(r2[3].why,'queens, with check','golden 23...f1=Q+: queens with check (reference: "queens anyway, with check")');
  eq(M.evalWords(-0.78),'Black is better by about three quarters of a pawn','evalWords row 1 (-0.78)');
  eq(M.evalWords(-1.33),'Black is better by about a pawn and a quarter','evalWords row 2 (-1.33)');
  eq(M.evalWords(0.1),'About level','evalWords near zero');
  eq(M.evalWords(99),'White has a forced mate','evalWords on a mate score');
  // NOT GENERIC, the job's 25% cap: every position of the bench games, with the next four PLAYED moves as the line. No phrase family
  // (the words before the first 'the', 'at' or ',') may account for more than 25% of the moves that got a phrase. The count is printed.
  const dir=path.join(__dirname,'..','claude','agents','bench','pgn');let fam={},n=0,lines=0;
  for(const f of fs.readdirSync(dir).filter(x=>/\.pgn$/.test(x))){
    const sans=M.parsePGN(fs.readFileSync(path.join(dir,f),'utf8'));const res=M.loadSANs(sans);if(!res||!res.plies)continue;
    for(let i=0;i+4<=res.plies.length;i+=2){const fen=M.toFEN(res.positions[i]);
      const uci=res.plies.slice(i,i+4).map(p=>{const m=p.move,sq=(r,c)=>'abcdefgh'[c]+(8-r);return sq(m.fr,m.fc)+sq(m.tr,m.tc)+(m.promo||'');});
      lines++;for(const x of M.explainLine(fen,uci,4)){if(!x.why)continue;n++;const k=x.why.split(/ the | at |,/)[0];fam[k]=(fam[k]||0)+1;}}}
  const top=Object.entries(fam).sort((a,b)=>b[1]-a[1]);
  console.log('   corpus: '+lines+' lines, '+n+' explained moves; top families: '+top.slice(0,6).map(([k,v])=>k+' '+Math.round(100*v/n)+'%').join(', '));
  eq(n>=100,true,'the corpus explained at least 100 moves, so the cap below is a measurement and not a sample of one');
  eq(n>0&&top[0][1]/n<=0.25,true,'NOT GENERIC: no phrase family explains more than 25% of the moves ('+(top[0]?top[0][0]+' '+Math.round(100*top[0][1]/n)+'%':'none')+')');
 }
 try{fs.rmSync(d,{recursive:true,force:true});}catch(e){}}
console.log('\n'+(fails?('*** '+fails+' UNIT FAILURES ***'):'all unit checks passed'));
process.exit(fails?1:0);
