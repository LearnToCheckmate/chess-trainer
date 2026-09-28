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
eq(mistakeWhy(pos,mvEmpty,'Rf3','Qxh3',2.0,0.2,'w'),'Rf3 was stronger. Qxh3 left you level.','white, crossing, band pair dropped by the 52 budget');
eq(mistakeWhy(pos,mvEmpty,'Rf3','Qxh3',-2.0,-0.2,'b'),'Rf3 was stronger. Qxh3 left you level.','black frame mirrors it');
// the band pair DOES survive when the words are short enough, which is the 7.6% case:
// AND THE ORDERING IS A DELIBERATE CHOICE, PINNED HERE. cands is [shape+pair, shape+one, bare+pair, bare+one],
// so a sentence that can afford the REASON with one band is preferred over one that drops the reason to show
// both bands. That is antagonist A's 4b applied, and it is WHY the measured band-pair rate is only 7.6%:
// "Rf3 was stronger. Qxh3 went from level to clearly better." is 57 characters and the budget is 52, while
// "Rf3 was stronger. Qxh3 left you clearly better." is 46 and fits. The reason wins.
eq(mistakeWhy(pos,mvEmpty,'Rf3','Qxh3',-0.2,-2.0,'b'),'Rf3 was stronger. Qxh3 left you clearly better.','the REASON is preferred over the band pair when only one fits');
console.log('\n--- motifs come from the BEST move, and a capture is named as material ---');
MOT=['fork'];   eq(mistakeWhy(pos,mvEmpty,'Nd5','Qxc2',1.0,0.1,'w'),'Nd5 forks two pieces. Qxc2 left you level.','fork clause (the REASON is kept, the band pair is what the budget spends)');
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
console.log('\n'+(fails?('*** '+fails+' UNIT FAILURES ***'):'all unit checks passed'));
process.exit(fails?1:0);
