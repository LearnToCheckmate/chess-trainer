// gates/opening-book/build.js  -  #549 item (98), jobs/opening-book-coverage-gap
//
// WHAT IT MAKES. chess.jsx's BOOK_POS: every NAMED opening position of lichess-org/chess-openings - the position at the end of each
// line of a.tsv .. e.tsv in this folder - as a 7-character key (chess.jsx bookKey: FNV-1a 32 over the FEN's board, side to move and
// castling, base 36), sorted, de-duplicated and concatenated. The keys are computed by the SHIPPED bookKey and loadSANs, read out of
// chess.jsx through gates/engine-extract.js, so the table cannot be keyed differently from the lookup that reads it.
//
// THE DATA. https://github.com/lichess-org/chess-openings (master, fetched 2026-11-07 from raw.githubusercontent.com): "As a collection
// of facts, this data set is in the public domain ... released under the CC0 Public Domain Dedication" (its README). md5 of the five
// files as vendored: a 38547252482c, b d5df8754d529, c f8a86b5866a0, d de41083d89bc, e 5b4957ac63e6. 3,865 lines (3,864 distinct named positions); never chess.com.
//
// USAGE:  node gates/opening-book/build.js            print the counts and whether chess.jsx's BOOK_POS is current (exit 1 if not)
//         node gates/opening-book/build.js --write    rewrite the BOOK_POS line in chess.jsx
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const E=require('../engine-extract');
const DIR=__dirname,SRC=E.SRC_PATH;
const MD5={a:'38547252482c',b:'d5df8754d529',c:'f8a86b5866a0',d:'de41083d89bc',e:'5b4957ac63e6'};
function build(){
  const keys=new Set();let lines=0,bad=0;
  for(const f of 'abcde'){
    const txt=fs.readFileSync(path.join(DIR,f+'.tsv'),'utf8');
    const m=crypto.createHash('md5').update(txt).digest('hex').slice(0,12);
    if(m!==MD5[f])throw new Error('opening-book: '+f+'.tsv md5 '+m+' is not the vendored '+MD5[f]);
    for(const row of txt.split('\n').slice(1)){if(!row.trim())continue;const pgn=row.split('\t')[2];
      const r=E.loadSANs(E.parsePGN(pgn));if(!r.ok||!r.plies.length){bad++;continue;}lines++;keys.add(E.bookKey(r.positions[r.positions.length-1]));}
  }
  return {lines,bad,keys:[...keys].sort()};
}
if(require.main===module){
  const b=build();const want=b.keys.join('');
  const src=fs.readFileSync(SRC,'utf8');const m=/^const BOOK_POS='([0-9a-z]*)';$/m.exec(src);
  console.log('# opening-book: chess.jsx md5 '+E.SOURCE_MD5+' | lines '+b.lines+' unplayable '+b.bad+' | named positions '+b.keys.length+' | BOOK_POS '+want.length+' chars');
  if(!m){console.log('FAIL: no BOOK_POS line in '+SRC);process.exit(1);}
  if(process.argv[2]==='--write'){fs.writeFileSync(SRC,src.replace(m[0],"const BOOK_POS='"+want+"';"));console.log('wrote BOOK_POS into '+SRC);}
  else if(m[1]===want)console.log('OK: BOOK_POS in chess.jsx is the table these five files make');
  else{console.log('STALE: BOOK_POS in chess.jsx ('+m[1].length+' chars) is not the table these files make - run with --write');process.exit(1);}
}
module.exports={build,MD5};
