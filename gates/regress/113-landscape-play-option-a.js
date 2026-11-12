'use strict';
// gates/regress/113-landscape-play-option-a.js - SIDEWAYS PLAY: THE BOARD FILLS THE HEIGHT, EVERYTHING ELSE ON THE RIGHT. TC-PL-071a..d, US-PL-27.
//
// WHY [#550, answer a23 of directOpening_2026_11_11_batch10; Kunal on the Desk, B10-Q23: "Option A: the board on the left, everything else
// on the right"; jobs/the-landscape-result-line-lives-in-a-scroller-that-can-take-it-off-screen-2026-09-29, mockup
// claude/agents/shots/550-70-mock-A761.png]. A sideways game stacked both player bars round the board (216px at 761x375) and a finished
// game put its result in a rail that could scroll it off screen. Now the bars are in the rail, the board takes the height, and a finished
// game's rail shows the result, the moves and four big buttons - Review, Rematch, New game, More - with nothing scrolled away.
//
// WHAT IT ASSERTS, a Pass & Play game started in portrait at kunal761 and turned to 761x375 and to 730x375:
//  (a) TC-PL-071a LIVE (1.e4 e5): the board is at least 340 tall and on screen, both player bars are in the rail (right of the board),
//      and the rail does not scroll (scrollHeight within 1px of clientHeight).
//  (b) TC-PL-071b FINISHED (Fool's mate): the board is the same size as live (it does not jump at the end), and the result card reads
//      Checkmate and Black wins.
//  (c) TC-PL-071c the four buttons Review, Rematch, New game and More are on screen, each 44px or taller, every centre hit-tests to its
//      own button, and the rail does not scroll; the bottom player bar is on screen too.
//  (d) TC-PL-071d no result card is drawn over the board (the rail carries it).
// DENOMINATOR per launch: the game reached the state (two plies live; checkmate) and the board is measured.
// CONTROL-RECORD: 372f372 2026-11-11 total=17 red=8 scope=trial:bbdae501c49d how=#550 answer a23: the tree before Option A (bars round a 216 board, the result card on the board, the six-button row) - TC-PL-071a-d red at 761x375 and 730x375; the denominators and the error lines green. On t58 17 of 17 green
// CONTROL-RECORD: e4a169a 2026-11-12 total=17 red=8 scope=trial:3ab724514641 how=#550 re-control of the gate as it stands today (the control audit read ASSERTIONS-MOVED): origin/main's own #549 bundle, which carries none of batch 10 - first red: 761x375 live: TC-PL-071a the board is 216 tall and on screen, both pla
const L=require('../lib');
const SIZES=[{w:761,h:375},{w:730,h:375}];
const read=(b)=>b.page.evaluate(()=>{const bd=[...document.querySelectorAll('div')].filter(d=>/repeat\(8/.test(d.style.gridTemplateColumns)).map(d=>d.getBoundingClientRect()).sort((a,c)=>c.width-a.width)[0];
  const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return r.height>0?{x:r.left,y:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height}:null;};
  const rail=document.querySelector('.ctside');const btns=['land-review','land-rematch','land-newgame','land-more'].map(k=>{const e=document.querySelector('[data-ct="'+k+'"]');if(!e)return null;const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {k,t:(e.innerText||'').trim(),h:r.height,y:r.top,b:r.bottom,hit:!!hit&&(hit===e||e.contains(hit))};});
  const card=document.querySelector('[data-ct="land-result"]');const over=[...document.querySelectorAll('div')].some(d=>{const r=d.getBoundingClientRect();return bd&&/Checkmate!/.test(d.textContent||'')&&r.left>=bd.left&&r.right<=bd.right&&r.top>=bd.top&&r.bottom<=bd.bottom&&r.width<bd.width*0.9;});
  return {vh:innerHeight,board:bd?{x:bd.left,y:bd.top,w:bd.width,b:bd.bottom,r:bd.right}:null,pt:q('[data-ct="pbar-top"]'),pb:q('[data-ct="pbar-bottom"]'),rail:rail?{sh:rail.scrollHeight,ch:rail.clientHeight}:null,btns,card:card?(card.innerText||'').replace(/\s+/g,' ').trim():null,overBoard:over};});
L.run(async()=>{
  for(const S of SIZES){const tag=S.w+'x'+S.h;let live=null;
    for(const kind of ['live','over']){
      const b=await L.launch({geo:'kunal761',name:'landA-'+kind+'-'+S.w});await b.open();
      let ok=true;try{await b.tile('Play');await b.tapText(/^Pass & Play$/);await b.tapText(/^▶ Start game$/,{wait:900});
        if(kind==='over'){await b.move('f2','f3',450);await b.move('e7','e5',450);await b.move('g2','g4',450);await b.move('d8','h4',900);}else{await b.move('e2','e4',450);await b.move('e7','e5',450);}
        await b.page.setViewportSize({width:S.w,height:S.h});await b.settle(1600);}catch(e){ok=false;L.note(tag+' '+kind+': '+String(e).slice(0,120));}
      const m=ok?await read(b):null;
      L.say(ok&&!!m&&!!m.board,tag+' '+kind+': TC-PL-071 DENOMINATOR the game is '+(kind==='over'?'checkmated':'two plies in')+' sideways and the board is measured',m&&m.board);
      if(m&&m.board){
        const railOk=!!m.rail&&m.rail.sh-m.rail.ch<=1;
        if(kind==='live'){live=m.board;
          L.say(m.board.w>=340&&m.board.y>=0&&m.board.b<=m.vh+0.5&&!!m.pt&&!!m.pb&&m.pt.x>=m.board.r&&m.pb.x>=m.board.r&&railOk,tag+' live: TC-PL-071a the board is '+Math.round(m.board.w)+' tall and on screen, both player bars are in the rail, and the rail does not scroll ('+(m.rail&&(m.rail.sh+'/'+m.rail.ch))+')',{board:m.board,pt:m.pt,pb:m.pb,rail:m.rail});
        }else{
          L.say(!!live&&Math.abs(m.board.w-live.w)<0.6&&Math.abs(m.board.y-live.y)<0.6&&/Checkmate/.test(m.card||'')&&/Black wins/.test(m.card||''),tag+' over: TC-PL-071b the board is the live size ('+Math.round(m.board.w)+' against '+(live&&Math.round(live.w))+') and the result card reads "'+m.card+'"',{board:m.board,live,card:m.card});
          const bs=m.btns;L.say(bs.every(x=>x&&x.h>=43.5&&x.y>=0&&x.b<=m.vh+0.5&&x.hit)&&bs.map(x=>x&&x.t.replace(/[^A-Za-z ]/g,'').trim()).join('|')==='Review|Rematch|New game|More'&&railOk&&!!m.pb&&m.pb.b<=m.vh+0.5,tag+' over: TC-PL-071c Review, Rematch, New game and More are on screen, 44px or taller and hit-testable, with the bottom bar on screen and the rail unscrolled ('+bs.map(x=>x?(x.t.replace(/\s+/g,' ')+' '+Math.round(x.h)):'missing').join(', ')+')',{btns:bs,rail:m.rail,pb:m.pb});
          L.say(!m.overBoard,tag+' over: TC-PL-071d no result card is drawn over the board',{overBoard:m.overBoard});
        }
      }
      L.say(b.errs.length===0,tag+' '+kind+': TC-PL-071 zero app errors',b.errs.slice(0,3));
      await b.close();
    }
  }
},'113-landscape-play-option-a');
