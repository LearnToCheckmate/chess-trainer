// gates/measure-drill-verdict-reserve.js
//
// THE ONE READING NOBODY HAS TAKEN, and every candidate fix on
// jobs/board-jumps-on-drill-verdict is a guess until somebody does.
//
// The worker's pre-measure of 2026-09-28 (that job, field preMeasuredByWorker_2026-09-28T21-16Z,
// candidate C) names it in these words: "the rendered height of the two-clause sentence at each of
// the seven geometries ... read the verdict element's scrollHeight rather than its clientHeight.
// If that number is <= 74 at every geometry then candidate B's 74 is right and only its BOARD COST
// is the problem; if it is > 74 then both existing candidates are wrong and the whole approach of a
// constant reserve is wrong. Nobody has taken that reading."
//
// This is a MEASUREMENT SCRIPT, not a gate. It asserts nothing and it emits no PASS lines, so it
// can never be mistaken for a push gate [#405, #461]. It prints a table.
//
// WHAT IT MEASURES, per geometry, per state, with the board rect in every one so the jump is
// re-measured at SEVEN geometries rather than the three #428 has:
//   - RESERVE   the maxHeight:74 container (chess.jsx, the pzView==='online' verdict box):
//               clientHeight, scrollHeight, computed maxHeight/height, rect
//   - NEED      the inner verdict div's own scrollHeight = what the sentence actually needs
//   - BOARD     the painted repeat(8,...) grid rect, so deltaTop and deltaW against the AT REST state
//   - RESET     the drill's Reset control rect and a hit test at its centre, because #428 measured
//               candidate B burying it under the position:fixed tab bar at 320x568 and the worker
//               recorded that as NOT MEASURED for the 30px branch
//
// STATES, in the order a player reaches them:
//   rest   the drill freshly opened, no verdict on screen        (the baseline every delta is against)
//   wrong  the player replays the move they actually played      (the state Kunal's screenshots show)
//   hint   the hint button pressed after a wrong answer
//   solved the stored move played                                (what gate 51's B7 already covers)
//
// PHASE 1 harvests ct_mymistakes by reviewing a REAL game through the stored-account path, exactly as
// gates/regress/51-drill-explain-why.js does, so the APP does the capturing and nothing in the fixture
// can satisfy the reading. The PGN and ACCT fixture below are gate 51's, unchanged.
'use strict';
const L=require('./lib');
const PGN=`[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.01"]
[White "Jsmiller1112"]
[Black "DukeKarlCountIsouard99"]
[Result "1-0"]
[WhiteElo "1523"]
[BlackElo "1487"]
[TimeControl "600"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;
const ACCT={ct_accts:['cc:dukekarlcountisouard99'],ct_acctgames:{'cc:dukekarlcountisouard99':[{src:'cc',acct:'dukekarlcountisouard99',pgn:PGN,white:'Jsmiller1112',black:'DukeKarlCountIsouard99',wr:'win',tc:'blitz',date:Date.now()-86400000}]},ct_pool:'3'};
// gate 51's seven, the set prompts/test-authoring names.
const ALLGEOS=[{w:320,h:568,n:'320x568'},{w:360,h:640,n:'360x640'},{w:375,h:667,n:'375x667'},{w:375,h:730,n:'375x730 KUNAL'},{w:390,h:844,n:'390x844'},{w:414,h:896,n:'414x896'},{w:440,h:956,n:'440x956'}];
const GEOS=process.env.CT_GEOMDV?ALLGEOS.filter(g=>process.env.CT_GEOMDV.split(',').some(x=>g.n.indexOf(x)===0)):ALLGEOS;

// The verdict box, located the way gate 51 locates it: the box carries NO data-ct (that is
// jobs/pz-verdict-box-has-no-data-ct), so the inner div is found by its own rendered text and the
// RESERVE is its parent. At REST there is no inner div at all, which is the whole defect, so the
// reserve is then found structurally: the LAST element child of [data-ct="pz-top"].
const readBox=(b)=>b.page.evaluate(()=>{
  const rd=(r)=>({w:Math.round(r.width*100)/100,h:Math.round(r.height*100)/100,top:Math.round(r.top*100)/100,bottom:Math.round(r.bottom*100)/100});
  const top=document.querySelector('[data-ct="pz-top"]');
  const out={vw:innerWidth,vh:innerHeight,found:false};
  if(!top)return out;
  const inner=[...top.querySelectorAll('div,span')].filter(e=>e.children.length===0&&/^(?:🎉|✗|💡)/.test((e.innerText||'').trim()));
  const e=inner[inner.length-1]||null;
  // the reserve: the inner div's parent when there is one, else pz-top's last element child
  const p=e?e.parentElement:(top.children.length?top.children[top.children.length-1]:null);
  if(p){const cs=getComputedStyle(p);
    out.reserve={...rd(p.getBoundingClientRect()),clientHeight:p.clientHeight,scrollHeight:p.scrollHeight,
                 cssHeight:cs.height,cssMaxHeight:cs.maxHeight,overflowY:cs.overflowY};}
  if(e){const cs=getComputedStyle(e);
    out.found=true;
    out.text=(e.innerText||'').replace(/\s+/g,' ').trim();
    out.need={...rd(e.getBoundingClientRect()),scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,
              lineHeight:cs.lineHeight,fontSize:cs.fontSize,padding:cs.padding,whiteSpace:cs.whiteSpace,chars:(e.innerText||'').trim().length};}
  // pz-top itself, because the reserve's cost to the board is pz-top's height
  out.pzTop={...rd(top.getBoundingClientRect()),scrollHeight:top.scrollHeight,clientHeight:top.clientHeight};
  return out;});

// The drill's Reset control, plus the hit test #428 built for it. elementFromPoint at its centre must
// return the button itself or one of its own descendants.
const readReset=(b)=>b.page.evaluate(()=>{
  const btns=[...document.querySelectorAll('button')].filter(x=>/↺|reset/i.test(x.innerText||''));
  const e=btns[btns.length-1];if(!e)return null;
  const r=e.getBoundingClientRect();const hit=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
  return {label:(e.innerText||'').trim(),top:Math.round(r.top*100)/100,bottom:Math.round(r.bottom*100)/100,
          hitsItself:!!(hit&&(hit===e||e.contains(hit))),hitTag:hit?(hit.tagName+(hit.className&&typeof hit.className==='string'?('.'+hit.className.split(/\s+/)[0]):'')):null,
          hitText:hit?((hit.innerText||'').replace(/\s+/g,' ').trim().slice(0,40)):null,vh:innerHeight};});

const bd=async(b)=>{const x=await b.board();return x?{w:Math.round(x.w*100)/100,top:Math.round(x.y*100)/100,sq:Math.round(x.sq*100)/100}:null;};

L.run(async()=>{
  // ===== PHASE 1: the app captures its own mistakes from a real review. gate 51's route. =============
  const h=await L.launch({geo:{w:375,h:730,safe:''},name:'mdv-capture',store:ACCT});await h.open();
  L.note('bundle on the page: '+await h.stamp());
  L.note('GEOMETRIES THIS RUN: '+GEOS.map(g=>g.n).join(', ')+(process.env.CT_GEOMDV?('   *** NARROWED by CT_GEOMDV ***'):'   (full seven)'));
  await h.tile('Review');await h.settle(700);
  await h.page.locator('button',{hasText:/Review ›/}).first().click();
  await h.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:240000});await h.settle(1200);
  const mis=await h.page.evaluate(()=>JSON.parse(localStorage.getItem('ct_mymistakes')||'[]'));
  L.note('ct_mymistakes captured by the app: '+mis.length);
  mis.forEach((m,i)=>L.note('  entry '+(i+1)+' keys='+Object.keys(m).join(',')+'  uci='+m.uci+'  played='+m.played+'  last='+JSON.stringify(m.last)+'  label='+m.label));
  await h.close();
  if(!mis.length){L.note('NOTHING CAPTURED - the reading cannot be taken. Stopping.');return;}
  const ITEMS=process.env.CT_MDV_ITEMS?process.env.CT_MDV_ITEMS.split(',').map(x=>+x-1):mis.map((_,i)=>i);
  L.note('ITEMS THIS RUN: '+ITEMS.map(i=>i+1).join(',')+' of '+mis.length+(process.env.CT_MDV_ITEMS?'   *** NARROWED by CT_MDV_ITEMS ***':'   (all captured)'));

  // the WRONG move: the move the player actually played. Its uci is on the entry; if the field shape
  // differs, fall back to the stored move's from-square played to a different file, and SAY SO.
  const rows=[];
  for(const g of GEOS){
    for(const i of ITEMS){
      const m=mis[i];
      // THE WRONG MOVE, AND WHY IT IS NOT m.last. The capture site stores `last` as the OPPONENT's
      // previous move for highlighting - {fr,fc,tr,tc} as row/col with row 0 = rank 8 - which decodes
      // to Nxb5 and Bxd7, White's moves, not the player's. `played` is a SAN string with no from-square,
      // so neither field yields a replayable uci for what the player did. So the wrong branch is reached
      // GENERICALLY: move the solution's own piece somewhere else. Candidates are tried in order and the
      // first one that puts a verdict on screen is used; the one actually used is printed.
      const from=m.uci.slice(0,2), f0=from.charCodeAt(0)-97, r0=+from[1];
      const ring=[];
      for(const [df,dr] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,1],[-1,1],[1,-1],[0,-2],[0,2],[-2,0],[2,0]]){
        const f=f0+df, r=r0+dr; if(f<0||f>7||r<1||r>8)continue;
        const sq=String.fromCharCode(97+f)+r; if(sq!==m.uci.slice(2,4))ring.push(from+sq);
      }
      const c=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'mdv-'+g.n.replace(/\s+/g,'_')+'-'+i,store:{ct_mymistakes:[m],ct_pool:'3'}});
      await c.open();await c.tile('Review');await c.settle(700);
      await c.tapText(/find the move you missed/,{wait:1500});
      await c.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});
      await c.settle(600);
      const rest={state:'rest',box:await readBox(c),board:await bd(c),reset:await readReset(c)};
      let wrong=null,hint=null;
      let usedWrong=null;
      for(const cand of ring){
        await c.move(cand.slice(0,2),cand.slice(2,4),900);await c.settle(1000);
        const bx=await readBox(c);
        if(bx.found&&/^✗/.test(bx.text||'')){usedWrong=cand;wrong={state:'wrong',box:bx,board:await bd(c),reset:await readReset(c),playedUci:cand};break;}
      }
      if(!usedWrong)L.note(g.n+' item '+(i+1)+': NO WRONG VERDICT REACHED over '+ring.length+' candidate moves - the wrong-answer row below is ABSENT, not zero');
      else{
        L.note(g.n+' item '+(i+1)+': wrong answer played as '+usedWrong+' (solution is '+m.uci+')');
        try{await c.tapText(/^💡 Hint$/,{wait:900});await c.settle(700);
            hint={state:'hint',box:await readBox(c),board:await bd(c),reset:await readReset(c)};}catch(e){hint={state:'hint',err:e.message.slice(0,60)};}
      }
      // solved: a fresh page, because a wrong answer may have changed the card's state
      const s=await L.launch({geo:{w:g.w,h:g.h,safe:''},name:'mdv-'+g.n.replace(/\s+/g,'_')+'-'+i+'-solved',store:{ct_mymistakes:[m],ct_pool:'3'}});
      await s.open();await s.tile('Review');await s.settle(700);
      await s.tapText(/find the move you missed/,{wait:1500});
      await s.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await s.settle(600);
      const sRest=await bd(s);
      await s.move(m.uci.slice(0,2),m.uci.slice(2,4),900);await s.settle(1100);
      const solved={state:'solved',box:await readBox(s),board:await bd(s),reset:await readReset(s),restBoard:sRest};
      await c.close();await s.close();
      rows.push({geo:g.n,item:i+1,rest,wrong,hint,solved});
    }
  }

  // ===== THE TABLE =================================================================================
  L.note('');
  L.note('=== NEED: the rendered height the verdict sentence ACTUALLY needs (inner scrollHeight), against the 74px cap ===');
  L.note('geo              item state   chars  needH   reserveCH reserveSH  cssH      cssMaxH   overflowY  >74?');
  const needs=[];
  for(const r of rows) for(const st of [r.rest,r.wrong,r.hint,r.solved]){
    if(!st||st.err||!st.box)continue;const b=st.box;
    const needH=b.need?b.need.scrollHeight:0;
    if(st.state!=='rest'&&b.found)needs.push({geo:r.geo,item:r.item,state:st.state,needH,chars:b.need?b.need.chars:0,text:b.text||''});
    L.note((r.geo+'                ').slice(0,17)+(' '+r.item+'   ')+(st.state+'      ').slice(0,8)+
      String(b.need?b.need.chars:0).padStart(5)+String(needH).padStart(7)+
      String(b.reserve?b.reserve.clientHeight:'-').padStart(11)+String(b.reserve?b.reserve.scrollHeight:'-').padStart(10)+
      '  '+String(b.reserve?b.reserve.cssHeight:'-').padEnd(9)+' '+String(b.reserve?b.reserve.cssMaxHeight:'-').padEnd(9)+' '+
      String(b.reserve?b.reserve.overflowY:'-').padEnd(10)+' '+(needH>74?'*** YES':'no'));
  }
  L.note('');
  L.note('=== THE JUMP, re-measured at all SEVEN geometries (the job has it at three) ===');
  L.note('geo              item state   boardW   dW       boardTop  dTop     sq');
  for(const r of rows){
    const base=r.rest.board;
    for(const st of [r.rest,r.wrong,r.hint,r.solved]){
      if(!st||st.err||!st.board)continue;
      const cmp=(st.state==='solved'&&st.restBoard)?st.restBoard:base;
      L.note((r.geo+'                ').slice(0,17)+(' '+r.item+'   ')+(st.state+'      ').slice(0,8)+
        String(st.board.w).padStart(8)+String(Math.round((st.board.w-cmp.w)*100)/100).padStart(9)+
        String(st.board.top).padStart(10)+String(Math.round((st.board.top-cmp.top)*100)/100).padStart(9)+
        String(st.board.sq).padStart(8));
    }
  }
  L.note('');
  L.note('=== RESET, at rest and after the verdict: does it hit-test to itself on LIVE MAIN? ===');
  for(const r of rows) for(const st of [r.rest,r.wrong,r.solved]){
    if(!st||st.err||!st.reset)continue;
    L.note((r.geo+'                ').slice(0,17)+(' '+r.item+'   ')+(st.state+'      ').slice(0,8)+
      ' y '+st.reset.top+'..'+st.reset.bottom+'  vh '+st.reset.vh+'  hitsItself '+st.reset.hitsItself+'  hit='+st.reset.hitTag+' "'+(st.reset.hitText||'')+'"');
  }
  L.note('');
  L.note('=== VERDICT STRINGS SEEN (so the next reader knows which sentence these numbers are of) ===');
  const seen=new Set();for(const n of needs){if(n.text&&!seen.has(n.text)){seen.add(n.text);L.note('  ['+n.chars+' chars] '+n.text);}}
  const worst=needs.reduce((a,n)=>n.needH>a.needH?n:a,{needH:-1});
  L.note('');
  L.note('=== THE ANSWER TO CANDIDATE C ===');
  L.note('WORST NEEDED HEIGHT over '+needs.length+' (geometry x state) readings: '+worst.needH+'px at '+worst.geo+' '+worst.state+' ('+worst.chars+' chars)');
  L.note(worst.needH>74
    ? 'SO A CONSTANT RESERVE OF 74 CANNOT HOLD THE CONTENT. Both existing candidates are struck and the constant-reserve approach is wrong.'
    : 'SO 74 HOLDS THE CONTENT at every geometry and state measured. Candidate B\'s NUMBER is right; what remains against it is its BOARD COST and the Reset overlap, and both of those are Kunal\'s to weigh.');
});
