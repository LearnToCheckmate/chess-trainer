// #547 item (117): replays each new endgame line in chess.js (npm chess.js@1.0.0; set CHESSJS to its path) and checks legality,
// the ending, one note per ply, no stalemate on the way, and every square claim the notes make. Printed ALL OK at commit.
const {Chess}=require(process.env.CHESSJS||'chess.js');const L=require('./547-endgame-lines-verified.js');let bad=0;
for(const l of L){const c=new Chess(l.fen);const fens=[];let ok=true;
 for(const s of l.line){const m=c.move(s);if(!m){console.log('ILLEGAL',l.name,s);ok=false;bad++;break;}fens.push(c.fen());}
 if(l.notes.length!==l.line.length){console.log('NOTES',l.name,l.notes.length,'vs',l.line.length);bad++;}
 const end=l.name.startsWith('King & Pawn')?(/=Q/.test(l.line[l.line.length-1])):c.isCheckmate();
 for(const [i,sq,col,exp] of l.claims){const g=new Chess(fens[i]);const got=g.isAttacked(sq,col);if(got!==exp){console.log('CLAIM',l.name,'ply',i+1,l.line[i],sq,'attacked by',col,'expected',exp,'got',got);bad++;}}
 for(let i=0;i<l.line.length;i++){const g=new Chess(i?fens[i-1]:l.fen);if(g.isStalemate()){console.log('STALE',l.name,i);bad++;}}
 console.log(l.name.padEnd(28),'plies',l.line.length,'legal',ok,'ends',end?'OK':'NO','claims',l.claims.length);}
console.log(bad?('BAD '+bad):'ALL OK');
