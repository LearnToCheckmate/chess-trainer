// gates/regress/80-castle-input.js   A PLAYER CAN CASTLE, BY EVERY GESTURE THE BOARD TAKES.
// #546, batch 6 item (53), for jobs/no-gate-ever-castles-so-the-one-input-path-kunal-named-has-never-been-exercised-2026-10-08.
// Story US-PL-12 is the nearest (Pass & Play, a move is made by the player's own finger); no clause names castling, and
// the job's case is recorded as TC-SUITE-332 rather than a story clause, because the gap is in the SUITE: no gate castled.
//
// WHY IT EXISTS. Before this file, every O-O / O-O-O in gates/regress was PGN fixture text handed to Review or a SAN regex
// that merely TOLERATED the token, and exactly one gate (65) drove the drag input path at all. So the row Kunal opened on
// 12 September - castling by hand - could be neither confirmed nor refuted by anything the project owns.
//
// WHAT IT DRIVES, at 375x761 (R19's settled geometry, GEOS.kunal761), in Pass & Play from a fresh game:
//   three castle-legal positions - White kingside (6 plies), White queenside (8 plies), Black kingside (7 plies) -
//   x three gestures each - TAP the king then its destination (the control that the position is right), DRAG the king
//   to its destination, DRAG the king onto its own rook. Nine castles, plus one NEGATIVE CONTROL: the king dragged to
//   an illegal square (e1 -> a5) must move nothing and add nothing to the move row.
//
// WHAT EACH CASTLE ASSERTS, and why each half is there:
//   C0 ARRIVAL: the setup reached its ply count and all four squares read as expected BEFORE the gesture - king and rook
//      images present on their origin squares, destination squares empty. Without it a castle that "did nothing" could be
//      a setup that missed, and a null image compared to a null image is a vacuous TRUE (gate 65's E1b lesson).
//   C1 THE KING MOVED: the king's own image (read off its origin square before the gesture) is now on its destination,
//      and the origin is empty.
//   C2 THE ROOK MOVED: the rook's own image is now on its castling square, and its corner is empty. A move that took
//      the king two squares and left the rook would pass C1 alone - which is the half of castling a drag handler can lose.
//   C3 THE RECORD: the move row's LAST token is exactly O-O or O-O-O, and the ply count rose by exactly one.
// Pieces are read by their <img> src off the board grid's own children (the widest div whose inline
// gridTemplateColumns is repeat(8,...) - there is no data-ct="board"), indexed through lib.js's flip flag, because Pass &
// Play flips the board to whoever is to move.
'use strict';
const L=require('../lib');const P=require('../drive/play');
const GEO='kunal761';
const SETUP={
  wk:[['e2','e4'],['e7','e5'],['g1','f3'],['g8','f6'],['f1','c4'],['f8','c5']],
  wq:[['d2','d4'],['d7','d5'],['b1','c3'],['b8','c6'],['c1','f4'],['c8','f5'],['d1','d2'],['d8','d7']],
  bk:[['e2','e4'],['e7','e5'],['g1','f3'],['g8','f6'],['f1','c4'],['f8','c5'],['a2','a3']],
};
const SIDE={
  wk:{k:'e1',kd:'g1',r:'h1',rd:'f1',san:'O-O',plies:6},
  wq:{k:'e1',kd:'c1',r:'a1',rd:'d1',san:'O-O-O',plies:8},
  bk:{k:'e8',kd:'g8',r:'h8',rd:'f8',san:'O-O',plies:7},
};
const CASES=[];
for(const s of ['wk','wq','bk'])for(const g of ['tap','drag-dest','drag-rook'])CASES.push({s,g});

const pieceAt=async(b,sq)=>{const bd=await b.board();if(!bd)return null;
  return b.page.evaluate(([s,flip])=>{
    const f=s.charCodeAt(0)-97,r=parseInt(s[1],10)-1;const col=flip?7-f:f,row=flip?r:7-r;
    const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
    let best=null;for(const e of g){const rc=e.getBoundingClientRect();if(rc.width<40)continue;if(!best||rc.width>best.w)best={w:rc.width,el:e};}
    if(!best)return null;const cell=best.el.children[row*8+col];if(!cell)return null;
    const img=cell.querySelector('img');return img?img.src:null;
  },[sq,bd.flip]);};
const short=(s)=>s?('...'+s.slice(-24)):s;
const moverow=(b)=>b.page.evaluate(()=>{const e=document.querySelector('[data-ct="play-moverow"]');return e?(e.innerText||'').replace(/\s+/g,' ').trim():null;});
const lastTok=(row)=>{const t=(row||'').split(' ').filter(Boolean);const x=t[t.length-1]||'';return x.replace(/^\d+(\.|…)/,'');};
// The drag is gate 65's instrument: press, move past the drag threshold so the piece is in hand, travel, release.
const drag=async(b,from,to)=>{const a=await b.sqCenter(from),z=await b.sqCenter(to);
  await b.page.mouse.move(a.x,a.y);await b.page.mouse.down();
  await b.page.mouse.move(a.x+14,a.y+14,{steps:3});await b.page.mouse.move(z.x,z.y,{steps:8});
  await b.page.waitForTimeout(80);await b.page.mouse.up();await b.page.waitForTimeout(600);};
async function setup(b,s){await P.states['pp-m0'](b);for(const [f,t] of SETUP[s])await b.move(f,t);await b.settle(400);return P.plies(b);}

L.run(async()=>{
  let errs=0;
  for(const c of CASES){
    const S=SIDE[c.s],tag=c.s+'/'+c.g;
    const b=await L.launch({geo:GEO,name:'castle-'+c.s+'-'+c.g});await b.open();
    const p0=await setup(b,c.s);
    const pre={k:await pieceAt(b,S.k),kd:await pieceAt(b,S.kd),r:await pieceAt(b,S.r),rd:await pieceAt(b,S.rd),row:await moverow(b)};
    L.say(p0===S.plies&&!!pre.k&&!!pre.r&&pre.kd===null&&pre.rd===null&&pre.k!==pre.r,
      tag+' C0 ARRIVAL: '+S.plies+' plies played, king on '+S.k+' and rook on '+S.r+' (two different images), '+S.kd+' and '+S.rd+' empty - so a castle that "did nothing" below cannot be a setup that missed',
      {plies:p0,k:short(pre.k),r:short(pre.r),kd:pre.kd,rd:pre.rd,row:pre.row});
    if(c.g==='tap')await b.move(S.k,S.kd);
    else await drag(b,S.k,c.g==='drag-rook'?S.r:S.kd);
    await b.settle(500);
    const post={k:await pieceAt(b,S.k),kd:await pieceAt(b,S.kd),r:await pieceAt(b,S.r),rd:await pieceAt(b,S.rd),row:await moverow(b)};
    const p1=await P.plies(b);
    L.say(!!pre.k&&post.kd===pre.k&&post.k===null,tag+' C1 THE KING MOVED: the image read off '+S.k+' before the gesture is now on '+S.kd+', and '+S.k+' is empty',{before:short(pre.k),onDest:short(post.kd),onOrigin:short(post.k)});
    L.say(!!pre.r&&post.rd===pre.r&&post.r===null,tag+' C2 THE ROOK MOVED TOO: the image read off '+S.r+' is now on '+S.rd+', and '+S.r+' is empty - a handler that moved the king two squares and left the rook passes C1 alone',{before:short(pre.r),onDest:short(post.rd),onCorner:short(post.r)});
    L.say(lastTok(post.row)===S.san&&p1===p0+1,tag+' C3 THE RECORD: the move row ends in exactly '+S.san+' and the game advanced by exactly one ply',{row:post.row,last:lastTok(post.row),plies:[p0,p1]});
    errs+=b.errs.length;await b.close();
  }
  // NEGATIVE CONTROL: an illegal king drag must change nothing. Without it, C1-C3 could be satisfied by an input layer
  // that teleports whatever is dragged wherever it is dropped.
  {
    const S=SIDE.wk;const b=await L.launch({geo:GEO,name:'castle-nc-illegal'});await b.open();
    const p0=await setup(b,'wk');
    const pre={k:await pieceAt(b,'e1'),a5:await pieceAt(b,'a5'),row:await moverow(b)};
    await drag(b,'e1','a5');await b.settle(500);
    const post={k:await pieceAt(b,'e1'),a5:await pieceAt(b,'a5'),row:await moverow(b)};const p1=await P.plies(b);
    L.say(p0===S.plies&&!!pre.k&&post.k===pre.k&&post.a5===null,'NC the king dragged e1 -> a5 (illegal) stays on e1 and a5 stays empty',{plies:p0,before:short(pre.k),after:short(post.k),a5:post.a5});
    L.say(post.row===pre.row&&p1===p0&&!/O-O/.test(post.row||''),'NC and the move row is unchanged, the ply count is unchanged, and no O-O appears',{before:pre.row,after:post.row,plies:[p0,p1]});
    errs+=b.errs.length;await b.close();
  }
  L.say(errs===0,'zero app errors across '+(CASES.length+1)+' launches',{errs});
});
