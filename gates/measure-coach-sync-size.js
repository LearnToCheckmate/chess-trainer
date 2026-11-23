#!/usr/bin/env node
// Measures what 30 synced coach games weigh against the account document's 1 MiB limit (1048576 bytes).
// Builds the rows exactly as chess.jsx does: row = {id,at,pgn,uc,w,b,res,n,notes}; pgn = headers + movetext, a note is "{text} "
// after its move (pgnMovesFrom, coachClean: one line, 300 chars max, braces/brackets removed); COACH_KEEP=30 (chess.jsx).
// It then sizes ct_coachgames the way it is stored in ctProgress: a JSON string inside the account document.
// Usage: node gates/measure-coach-sync-size.js [--assert]   (--assert exits 1 if the worst case exceeds half the limit)
const LIMIT=1048576, KEEP=30;
const SAN=['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Nb8','d4','Nbd7','Nbd2','Bb7','Bc2','Re8','Nf1','Bf8','Ng3','g6','Bg5','h6','Bd2','Bg7','a4','c5','d5','c4','Bg4','Qc7','Qd2','Kh7'];
function game(plies,noteEvery,noteLen,id){let s='',n=1;const notes=[];
  for(let i=0;i<plies;i++){const white=i%2===0;if(white)s+=n+'. ';else if(i===0||notes[notes.length-1]===i)s+=n+'... ';
    s+=SAN[i%SAN.length]+' ';if(!white)n++;
    if(noteEvery&&(i+1)%noteEvery===0){s+='{'+'n"ote '.repeat(Math.ceil(noteLen/6)).slice(0,noteLen)+'} ';notes.push(i+1);}}
  const pgn='[White "Kunal"]\n[Black "Computer (1500)"]\n[Result "*"]\n[CTCoach "h3 t5 e7"]\n\n'+s.trim();
  return {id:'c'+(1e9+id).toString(36),at:1790000000000+id,pgn,uc:'w',w:'Kunal',b:'Computer (1500)',res:'*',n:plies,notes:notes.length};}
const cases=[['typical: 40 plies, a note every 6th, 80 chars',40,6,80],['long: 120 plies, a note every 4th, 150 chars',120,4,150],['worst: 300 plies, a note on EVERY ply, 300 chars (a quote in each note)',300,1,300]];
let worst=0;
for(const [name,pl,ev,len] of cases){const arr=[];for(let i=0;i<KEEP;i++)arr.push(game(pl,ev,len,i));
  const inner=JSON.stringify(arr),doc=JSON.stringify({ctProgress:{ct_coachgames:inner}});
  const b=Buffer.byteLength(doc);worst=Math.max(worst,b);
  console.log(name+'\n  rows '+arr.length+', ct_coachgames string '+Buffer.byteLength(inner)+' B, as stored in ctProgress (escaped) '+b+' B = '+(b/LIMIT*100).toFixed(1)+'% of 1 MiB');}
console.log('worst case '+worst+' B; headroom left for everything else in the document: '+(LIMIT-worst)+' B');
if(process.argv.includes('--assert')&&worst>LIMIT/2){console.log('FAIL: worst case over half the limit');process.exit(1);}
