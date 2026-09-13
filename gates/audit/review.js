// gates/audit/review.js - the Review screen audit (HANDOFF 0c): runs every state of gates/drive/review.js at
// 'kunal' (375x679 + ct_safe 51/31, the lib's geometry), 'k761' (375x761 + ct_safe 51/31: the same phone with the
// insets as env() gives them - the review fit loop subtracts safeTop+safeBot from vp.h, so at 'kunal' they are
// counted twice), '390' (390x844), and the width-dependent states at 'se' (320x568) and '430' (430x932).
// One line per measurement:  MEASURE <geo> <state> <metric>=<value>   and a PNG per state in
// gates/shots/audit/review/<geo>-<state>.png; a JSON of everything in measures.json next to them.
//   cd /home/user/chess-trainer && timeout 900 node gates/audit/review.js
'use strict';
const path=require('path'),fs=require('fs');
process.env.CT_SHOTS=path.join(__dirname,'..','shots','audit','review');
const L=require('../lib');
const D=require('../drive/review');
const GEOS={kunal:'kunal',k761:{w:375,h:761,safe:'51,31'},'390':'390',se:'se','430':'430'};
const ALL=['list-empty','list-stored','summary','summary-scrolled','moves-ply0','moves-ply5','moves-ply10','moves-ply31','moves-last','moves-last-engine','why-open','analysis','analysis-undo','analysis-exit','more-sheet','flipped','flipped-off','back-summary','back-list','fab-corner-last','fab-corner-mid','stored-review','evalgraph','evalgraph-last','evalgraph-off'];
const SUBSET=['list-stored','summary','moves-ply0','moves-last','why-open','analysis','analysis-exit','evalgraph','evalgraph-off'];
const PLAN=[['kunal',ALL],['k761',ALL],['390',ALL],['se',SUBSET],['430',SUBSET]];
const only=process.argv[2]?new RegExp(process.argv[2]):null;
const out=[];
function M(geo,state,k,v){const val=(typeof v==='number')?Math.round(v*100)/100:(v==null?'null':(typeof v==='object'?JSON.stringify(v):String(v)));console.log('MEASURE '+geo+' '+state+' '+k+'='+val);out.push({geo,state,k,v:val});}

// everything measurable on the screen, nulls for what is not there
async function probe(b){
  return b.page.evaluate(()=>{
    const R=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:+r.left.toFixed(1),y:+r.top.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};};
    const Q=(s)=>document.querySelector(s);const QA=(s)=>[...document.querySelectorAll(s)];
    const visible=(e)=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
    const grid=QA('div').filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).sort((a,c)=>c.getBoundingClientRect().width-a.getBoundingClientRect().width)[0]||null;
    const o={vw:innerWidth,vh:innerHeight};
    if(grid){const g=grid.getBoundingClientRect();o.board={x:+g.left.toFixed(1),y:+g.top.toFixed(1),w:+g.width.toFixed(1)};o.sq=g.width/8;
      // round elements inside the board: the verdict badge (not the fab)
      const rounds=[];grid.querySelectorAll('*').forEach(e=>{const st=getComputedStyle(e);if(st.borderRadius==='50%'){const q=e.getBoundingClientRect();if(q.width<2)return;rounds.push({ct:e.getAttribute('data-ct'),txt:(e.innerText||'').trim().slice(0,4),x:+(q.left-g.left).toFixed(2),y:+(q.top-g.top).toFixed(2),w:+q.width.toFixed(1),h:+q.height.toFixed(1)});}});
      o.badges=rounds.filter(r=>r.ct!=='rev-fab'&&r.w<=24); /* the 17px verdict badge; never a legal-move dot or a capture ring (HANDOFF trap) */
      const fab=Q('[data-ct="rev-fab"]');if(fab&&visible(fab)){const f=fab.getBoundingClientRect();o.fab={x:+(f.left-g.left).toFixed(1),y:+(f.top-g.top).toFixed(1),w:f.width,h:f.height,side:(f.left-g.left)<g.width/2?'left':'right'};
        // overlap with the corner square under it (bottom-left or bottom-right display square) and the piece there
        const sq=g.width/8;const cx=o.fab.side==='left'?0:g.width-sq;const cy=g.height-sq;const ox=Math.max(0,Math.min(f.left-g.left+f.width,cx+sq)-Math.max(f.left-g.left,cx));const oy=Math.max(0,Math.min(f.top-g.top+f.height,cy+sq)-Math.max(f.top-g.top,cy));o.fab.overlapW=+ox.toFixed(1);o.fab.overlapH=+oy.toFixed(1);o.fab.overlapPct=Math.round(ox*oy/(sq*sq)*100);
        const kids=[...grid.children].slice(0,64);const corner=kids[o.fab.side==='left'?56:63];o.fab.cornerPiece=corner?!!(corner.querySelector('img,svg')):null;}
      const won=QA('div,span').find(e=>e.children.length<=2&&/ won\b/.test(e.innerText||'')&&e.getBoundingClientRect().width<g.width&&e.getBoundingClientRect().top>=g.top-2&&e.getBoundingClientRect().bottom<=g.bottom+2);if(won)o.resultOverlay={txt:(won.innerText||'').replace(/\s+/g,' ').slice(0,40),...R(won)};
    }
    const el=(s)=>{const e=Q(s);return e&&visible(e)?R(e):null;};
    o.pbarTop=el('[data-ct="pbar-top"]');o.pbarBottom=el('[data-ct="pbar-bottom"]');o.revBack=el('[data-ct="rev-back"]');o.revMore=el('[data-ct="rev-more"]');
    o.compact=el('[data-ct="rev-compact"]');o.moveLine=el('[data-ct="rev-move-line"]');o.why=el('[data-ct="rev-why"]');o.row1=el('[data-ct="rev-row1"]');o.strip=el('[data-ct="strip-row"]');
    o.evalBar=el('[data-ct="eval-bar-v"]');const en=Q('[data-ct="eval-bar-num"]');o.evalLabel=en?(en.innerText||'').trim():null;
    const eb=Q('[data-ct="eval-bar-v"]');if(eb){const fill=eb.firstElementChild;o.evalFillPct=fill?fill.style.height:null;}
    const wt=Q('[data-ct="rev-why-txt"]');if(wt){const r=wt.getBoundingClientRect();const lh=parseFloat(getComputedStyle(wt).lineHeight)||17;o.whyTxt={h:+r.height.toFixed(1),scrollH:wt.scrollHeight,lines:Math.round(wt.scrollHeight/lh),txt:(wt.innerText||'').slice(0,90)};}
    o.bestline=el('[data-ct="rev-bestline"]');o.engline=el('[data-ct="rev-engline"]');
    const ml=Q('[data-ct="rev-move-line"]');if(ml)o.moveLineTxt=(ml.innerText||'').replace(/\s+/g,' ').slice(0,80);
    const row=Q('[data-ct="rev-row1"]');if(row){o.row1Btns=[...row.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return (x.innerText||x.title||'').trim().slice(0,14)+':'+Math.round(r.width)+'x'+Math.round(r.height);});o.row1MinH=Math.min(...[...row.querySelectorAll('button')].map(x=>x.getBoundingClientRect().height));o.row1MinW=Math.min(...[...row.querySelectorAll('button')].map(x=>x.getBoundingClientRect().width));}
    const st=Q('[data-ct="strip-row"]');if(st){const ar=[...st.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return {w:+r.width.toFixed(1),h:+r.height.toFixed(1)};});o.stripArrows=ar;const sp=QA('[data-mstrip] span[style*="cursor: pointer"]');if(sp.length){const r=sp[Math.min(3,sp.length-1)].getBoundingClientRect();o.stripSpan={w:+r.width.toFixed(1),h:+r.height.toFixed(1),n:sp.length,font:getComputedStyle(sp[0]).fontSize};}}
    // player bar names: the nowrap/ellipsis span
    const nm=(bar)=>{const e=Q('[data-ct="'+bar+'"]');if(!e)return null;const s=[...e.querySelectorAll('span')].find(x=>getComputedStyle(x).textOverflow==='ellipsis'&&getComputedStyle(x).whiteSpace==='nowrap');if(!s)return null;return {txt:(s.innerText||'').slice(0,30),clientW:s.clientWidth,scrollW:s.scrollWidth,cut:Math.max(0,s.scrollWidth-s.clientWidth),font:getComputedStyle(s).fontSize};};
    o.nameTop=nm('pbar-top');o.nameBottom=nm('pbar-bottom');
    const gr=Q('[data-ct="eval-graph"]');if(gr&&visible(gr)){const r=gr.getBoundingClientRect();const pb=Q('[data-ct="pbar-bottom"]').getBoundingClientRect();const lines=[...gr.querySelectorAll('line')];const acc=lines.find(l=>/var\(--ac\)/.test(l.getAttribute('stroke')||''));o.graph={x:+r.left.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),rightGapToBar:+(pb.right-r.right).toFixed(1),curX:acc?+acc.getAttribute('x1'):null,ticks:lines.length-1-(acc?1:0)};}
    // summary
    const sm=Q('[data-ct="rev-summary"]');if(sm&&visible(sm)){o.summary=R(sm);const sc=sm.querySelector('.scroll');if(sc){const r=sc.getBoundingClientRect();o.summaryScroll={top:+r.top.toFixed(1),bottom:+r.bottom.toFixed(1),scrollH:sc.scrollHeight,clientH:sc.clientHeight,scrollTop:sc.scrollTop};}
      o.foot=el('[data-ct="rev-summary-foot"]');const sk=Q('[data-ct="rev-skills"]');if(sk){o.skills=R(sk);}const fb=[...(Q('[data-ct="rev-summary-foot"]')||{querySelectorAll:()=>[]}).querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return (x.innerText||'').trim().slice(0,16)+':'+Math.round(r.width)+'x'+Math.round(r.height);});o.footBtns=fb;
      const h=QA('[data-ct="rev-summary"] div').filter(d=>/^\S+ vs \S/.test((d.innerText||'').trim())).sort((a,c)=>a.getBoundingClientRect().height-c.getBoundingClientRect().height)[0];if(h){o.summaryHead={txt:(h.innerText||'').replace(/\s+/g,' ').slice(0,60),clientW:h.clientWidth,scrollW:h.scrollWidth,h:+h.getBoundingClientRect().height.toFixed(1),font:getComputedStyle(h).fontSize};}}
    // the list
    const ta=Q('textarea');if(ta&&visible(ta)&&!(sm&&visible(sm))){o.list=true;const rows=QA('button').filter(x=>/Review ›/.test(x.innerText||''));o.rows=rows.map(x=>{const r=x.getBoundingClientRect();const s=[...x.querySelectorAll('span')].find(y=>getComputedStyle(y).textOverflow==='ellipsis'&&getComputedStyle(y).whiteSpace==='nowrap');return {h:+r.height.toFixed(1),w:+r.width.toFixed(1),name:s?(s.innerText||'').slice(0,40):null,cut:s?Math.max(0,s.scrollWidth-s.clientWidth):null,badge:(x.innerText||'').trim().split('\n')[0].slice(0,6)};});
      o.chips=el('[data-ct="acct-chips"]');const chipBtns=QA('[data-ct="acct-chips"] button').map(x=>{const r=x.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height);});if(chipBtns.length)o.chipRemoveBtns=chipBtns;
      const ana=QA('button').find(x=>/Analyze Game/.test(x.innerText||''));o.analyzeBtn=R(ana);o.textarea=R(ta);
      const tb=QA('div').find(d=>/position: fixed/.test(d.getAttribute('style')||'')&&/bottom: 0px/.test(d.getAttribute('style')||'')&&d.querySelector('button'));o.tabBar=R(tb);}
    const sh=Q('[data-ct="rev-sheet"]');if(sh&&visible(sh)){o.sheet=R(sh);o.sheetItems=[...sh.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return (x.innerText||'').replace(/\s+/g,' ').trim().slice(0,26)+':'+Math.round(r.width)+'x'+Math.round(r.height);});o.sheetScrollH=sh.scrollHeight;o.sheetClientH=sh.clientHeight;}
    return o;
  });
}

async function measure(b,geo,state){
  const m=await b.metrics();const p=await probe(b);
  if(m.board){M(geo,state,'board.w',m.board.w);M(geo,state,'board.top',m.board.top);M(geo,state,'board.left',m.board.left);M(geo,state,'board.rightGap',+(p.vw-(m.board.left+m.board.w)).toFixed(1));M(geo,state,'board.flip',m.board.flip);}
  else M(geo,state,'board','none');
  M(geo,state,'over',m.over.over);M(geo,state,'docScroll',m.over.docScroll);M(geo,state,'errs',b.errs.length);
  if(b.errs.length)M(geo,state,'errs.txt',b.errs.slice(0,3).join(' | ').slice(0,300));
  for(const k of ['pbarTop','pbarBottom','revBack','revMore','compact','moveLine','why','row1','strip','evalBar','bestline','engline','foot','skills','summaryScroll','sheet','chips','analyzeBtn','textarea','tabBar','resultOverlay','graph','fab','whyTxt','nameTop','nameBottom','stripSpan','summaryHead'])if(p[k]!=null)M(geo,state,k,p[k]);
  for(const k of ['evalLabel','evalFillPct','moveLineTxt','row1Btns','row1MinH','row1MinW','stripArrows','footBtns','rows','chipRemoveBtns','sheetItems','sheetScrollH','sheetClientH'])if(p[k]!=null)M(geo,state,k,p[k]);
  if(p.badges&&p.badges.length){M(geo,state,'badges',p.badges);const clipTop=Math.max(0,...p.badges.map(x=>-x.y));const clipRight=Math.max(0,...p.badges.map(x=>x.x+x.w-p.board.w));M(geo,state,'badge.clipTop',+clipTop.toFixed(2));M(geo,state,'badge.clipRight',+clipRight.toFixed(2));const bw=Math.max(...p.badges.map(x=>x.w));M(geo,state,'badge.w',bw);if(p.board){M(geo,state,'badge.clipBottom',+Math.max(0,...p.badges.map(x=>x.y+x.h-p.board.w)).toFixed(2));}}
  else if(p.board&&/ply31|last|flipped$|fab-corner/.test(state))M(geo,state,'badges','none');
  if(p.stripSpan)M(geo,state,'stripSpan.h',p.stripSpan.h);
  if(p.stripArrows&&p.stripArrows.length)M(geo,state,'stripArrow.w',Math.min(...p.stripArrows.map(x=>x.w)));
  if(p.foot&&p.summaryScroll){M(geo,state,'foot.bottomVsVh',+(p.foot.y+p.foot.h-p.vh).toFixed(1));M(geo,state,'foot.inViewport',(p.foot.y>=0&&p.foot.y+p.foot.h<=p.vh+0.5));M(geo,state,'summary.scrollEndsAtFootTop',+(p.summaryScroll.bottom-p.foot.y).toFixed(1));M(geo,state,'summary.scrollable',p.summaryScroll.scrollH-p.summaryScroll.clientH);}
  if(p.skills&&p.foot)M(geo,state,'skills.bottomVsFootTop',+(p.skills.y+p.skills.h-p.foot.y).toFixed(1));
  if(p.sheet)M(geo,state,'sheet.bottomVsVh',+(p.sheet.y+p.sheet.h-p.vh).toFixed(1));
  if(p.pbarBottom&&p.compact&&!p.summary)M(geo,state,'bandUnderBottomBar',+(p.compact.y-(p.pbarBottom.y+p.pbarBottom.h)).toFixed(1)); /* empty space between the bottom player bar and the move line */
  if(p.strip)M(geo,state,'strip.bottomVsVh',+(p.strip.y+p.strip.h-p.vh).toFixed(1));
  if(p.fab&&p.board)M(geo,state,'fab.side',p.fab.side+' overlap '+p.fab.overlapW+'x'+p.fab.overlapH+' of sq '+(p.board.w/8).toFixed(1)+' piece='+p.fab.cornerPiece);
  if(p.nameTop)M(geo,state,'nameTop.cut',p.nameTop.cut);if(p.nameBottom)M(geo,state,'nameBottom.cut',p.nameBottom.cut);
  if(p.rows&&p.rows.length)M(geo,state,'rows.maxCut',Math.max(...p.rows.map(r=>r.cut||0)));
  if(p.graph)M(geo,state,'graph.w',p.graph.w);if(p.graph)M(geo,state,'graph.curX',p.graph.curX);
  if(b._ctPageErrs&&b._ctPageErrs.length)M(geo,state,'pageerrs',b._ctPageErrs.map(x=>x.slice(0,400)));
  const shot=await b.shot(geo+'-'+state);M(geo,state,'png',shot);
  return {m,p};
}

L.run(async()=>{
  const summary=[];
  for(const [gname,list] of PLAN){
    if(only&&!only.test(gname))continue;
    const b=await L.launch({geo:GEOS[gname],store:{ct_pool:'3'},name:'audit-review-'+gname});
    b._ctPageErrs=[];b.page.on('pageerror',e=>{b._ctPageErrs.push(new Date().toISOString().slice(11,19)+' '+String(e&&e.message||e)+' :: '+String(e&&e.stack||'').replace(/\s+/g,' ').slice(0,300));});
    await b.open();
    M(gname,'boot','stamp',await b.stamp());
    for(const s of list){
      const t0=Date.now();
      try{await D.states[s](b);const r=await measure(b,gname,s);M(gname,s,'ms',Date.now()-t0);summary.push({geo:gname,state:s,board:r.m.board,over:r.m.over.over,errs:b.errs.length});}
      catch(e){M(gname,s,'ERROR',String(e).split('\n')[0].slice(0,200));try{await b.shot(gname+'-'+s+'-ERROR');}catch(e2){}L.say(false,gname+' '+s+' threw: '+String(e).split('\n')[0].slice(0,160));}
    }
    // the board-screen invariant: one top and one width across the review's move-screen states (analysis included)
    const mv=summary.filter(x=>x.geo===gname&&x.board&&/^(moves-|why-open|analysis|more-sheet|flipped|evalgraph$|fab-corner)/.test(x.state));
    const tops=[...new Set(mv.map(x=>x.board.top))],ws=[...new Set(mv.map(x=>x.board.w))];
    M(gname,'invariant','board.tops',tops);M(gname,'invariant','board.widths',ws);
    L.say(ws.length===1,gname+' one board width across the move-screen states',ws);
    L.say(tops.length===1,gname+' one board top across the move-screen states',tops);
    L.say(mv.every(x=>x.over<=0),gname+' no overflow on the board screen',mv.filter(x=>x.over>0).map(x=>x.state+':'+x.over));
    L.say(b.errs.length===0,gname+' zero app console errors',b.errs.slice(0,3));
    await b.close();
  }
  fs.mkdirSync(L.SHOTS,{recursive:true});fs.writeFileSync(path.join(L.SHOTS,'measures.json'),JSON.stringify(out,null,0));
  L.say(true,'measures written: '+out.length+' lines -> '+path.join(L.SHOTS,'measures.json'));
},'AUDIT-REVIEW');
