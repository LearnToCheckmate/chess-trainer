// gates/audit/lesson.js - the audit of the Lesson screen on the live bundle (HANDOFF 0c): every state of
// gates/drive/lesson.js at Kunal's geometry (375x679) and 390x844, the width-dependent states also at 320x568 and
// 430x932. One line per measurement:  MEASURE <geo> <state> <metric>=<value>
// and one PNG per state in gates/shots/audit/lesson/<geo>-<state>.png. PASS/FAIL lines at the end assert the
// board-screen invariants (one board top and width across the lesson's states, over<=0, zero app errors).
//   cd /home/user/chess-trainer && timeout 900 node gates/audit/lesson.js            (all geometries)
//   node gates/audit/lesson.js kunal 390                                              (a subset, e.g. in parallel)
'use strict';
const path=require('path');
process.env.CT_SHOTS=path.join(__dirname,'..','shots','audit','lesson');
const L=require('../lib');const D=require('../drive/lesson');
const ALL=Object.keys(D.states);
const WIDTH_STATES=['openings-list','demo-end','practice-m0','practice-wrong','gambit-demo-end','gambit-practice-m0','endgame-demo-end'];
let PLAN=[['kunal',ALL],['390',ALL],['se',WIDTH_STATES],['430',WIDTH_STATES]];
const want=process.argv.slice(2);if(want.length)PLAN=PLAN.filter(p=>want.includes(p[0]));
const R={};
const M=(geo,st,k,v)=>{R[geo]=R[geo]||{};R[geo][st]=R[geo][st]||{};R[geo][st][k]=v;console.log('MEASURE '+geo+' '+st+' '+k+'='+(typeof v==='object'?JSON.stringify(v):v));};
const LIST=/list|^discover$|^tactics$/,SHEET=/lines$|more$/;

async function measure(b,geo,st){
  const m=await b.metrics();
  if(m.board){M(geo,st,'board.w',m.board.w);M(geo,st,'board.top',m.board.top);M(geo,st,'board.left',m.board.left);M(geo,st,'board.bottom',Math.round((m.board.top+m.board.w)*10)/10);}
  else M(geo,st,'board','none');
  M(geo,st,'over.over',m.over.over);M(geo,st,'over.bottom',m.over.bottom);M(geo,st,'scrollY',m.over.scrollY);M(geo,st,'docScroll',m.over.docScroll);
  M(geo,st,'errs',b.errs.length);if(b.errs.length)M(geo,st,'errs.text',b.errs.slice(0,3));
  M(geo,st,'tabbar',await b.tabBarVisible());
  const btns=await D.btnRects(b);M(geo,st,'buttons',btns.map(x=>x.t).join('|'));
  // the note box: height, lines, text, clipped?
  const note=await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="lesson-note"]');if(!e)return null;const r=e.getBoundingClientRect();const st=getComputedStyle(e);
    // the deepest element that holds the text (the note itself or its text child)
    let tx=e;for(const c of e.querySelectorAll('div,span,p')){if((c.innerText||'').trim().length>=(e.innerText||'').trim().length-2&&c.getBoundingClientRect().height>0){tx=c;break;}}
    const cs=getComputedStyle(tx);const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.3;
    return {h:Math.round(r.height*10)/10,top:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,sh:e.scrollHeight,ch:e.clientHeight,txSh:tx.scrollHeight,txCh:tx.clientHeight,ovf:st.overflowY,fs:cs.fontSize,lh:Math.round(lh*10)/10,lines:Math.round(tx.getBoundingClientRect().height/lh*10)/10,text:(e.innerText||'').replace(/\s+/g,' ').trim(),len:(e.innerText||'').trim().length};});
  if(note){M(geo,st,'note.clamp',note.txSh+'/'+note.txCh+(note.txSh>note.txCh+1?' CLAMPED(text cut, no scroll)':''));M(geo,st,'note.ovf',note.ovf);M(geo,st,'note.h',note.h);M(geo,st,'note.top',note.top);M(geo,st,'note.lines',note.lines);M(geo,st,'note.fs',note.fs);M(geo,st,'note.scroll',note.sh+'/'+note.ch+(note.sh>note.ch+1?' CLIPPED':''));M(geo,st,'note.len',note.len);M(geo,st,'note.text',note.text.slice(0,140));}
  // button rows above and below the board (not the fixed bottom bar); a row = buttons sharing a top (+-6px)
  if(m.board){const bar=await b.page.evaluate(()=>{const e=document.querySelector('button[aria-label="Close lesson"]');if(!e)return null;const r=e.parentElement.getBoundingClientRect();return {top:Math.round(r.top*10)/10,h:Math.round(r.height*10)/10};});
    if(bar){M(geo,st,'bottombar.top',bar.top);M(geo,st,'bottombar.h',bar.h);}
    const inRows=(list)=>{const rows=[];for(const x of list.sort((a,b2)=>a.y-b2.y)){const r=rows.find(rr=>Math.abs(rr.y-x.y)<=6);if(r)r.items.push(x);else rows.push({y:x.y,items:[x]});}return rows;};
    const above=inRows(btns.filter(x=>x.y+x.h<=m.board.top+1)),below=inRows(btns.filter(x=>x.y>=m.board.top+m.board.w-1&&(!bar||x.y<bar.top-1)));
    M(geo,st,'rows.above',above.length);M(geo,st,'rows.below',below.length);M(geo,st,'rows.belowDetail',below.map(r=>'@'+r.y+':'+r.items.map(i=>i.t+' '+i.w+'x'+i.h).join(',')).join(' | ')||'none');
    if(above.length)M(geo,st,'rows.aboveDetail',above.map(r=>'@'+r.y+':'+r.items.map(i=>i.t+' '+i.w+'x'+i.h).join(',')).join(' | '));
  }
  // tap targets (A-11, A-25)
  const by=(re)=>btns.filter(x=>re.test(x.t));
  for(const [k,re] of [['back',/^Back a move$/],['fwd',/^Forward a move$/],['play',/^(▶|⏸|↻|Play or pause)$/],['close',/^(✕|Close lesson)$/],['flip',/^(⟳ Flip|⟳|Flip the board)$/],['hint',/^(💡|Hints)$/],['tryagain',/^↻ Try again$/],['try',/^✋ Now I'll try it$/],['lines',/^♟ Other lines/],['analyze',/Analyze$/],['copy',/Copy moves$/]]){const r=by(re);if(r.length)M(geo,st,'tap.'+k,r.map(x=>x.w+'x'+x.h+'@'+x.x+','+x.y).join(' '));}
  const dots=by(/^(⋯|More actions|More for this lesson)$/);M(geo,st,'dots.count',dots.length);if(dots.length)M(geo,st,'dots.rects',dots.map(x=>x.t+' '+x.w+'x'+x.h+'@'+x.x+','+x.y).join(' | '));
  const small=btns.filter(x=>(x.w<40||x.h<40)&&!LIST.test(st));if(small.length)M(geo,st,'tap.under40',small.map(x=>x.t+' '+x.w+'x'+x.h).join('; '));
  // the moves panel: moves-head to the bottom bar
  const mh=await b.rect('[data-ct="moves-head"]');if(mh){M(geo,st,'moveshead.top',Math.round(mh.y*10)/10);
    const panel=await b.page.evaluate(()=>{const h=document.querySelector('[data-ct="moves-head"]');if(!h)return null;let p=h;for(let i=0;i<4&&p.parentElement;i++){p=p.parentElement;if(p.getBoundingClientRect().height>h.getBoundingClientRect().height+20)break;}const r=p.getBoundingClientRect();const bar=document.querySelector('button[aria-label="Close lesson"]');const bt=bar?bar.parentElement.getBoundingClientRect().top:innerHeight;return {top:Math.round(r.top*10)/10,h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10,toBar:Math.round((bt-r.bottom)*10)/10,sh:p.scrollHeight,ch:p.clientHeight,text:(p.innerText||'').replace(/\s+/g,' ').trim().slice(0,80)};});
    if(panel){M(geo,st,'moves.panel.h',panel.h);M(geo,st,'moves.panel.bottom',panel.bottom);M(geo,st,'moves.panel.toBar',panel.toBar);M(geo,st,'moves.panel.scroll',panel.sh+'/'+panel.ch);M(geo,st,'moves.text',panel.text);}}
  // lists
  if(LIST.test(st)){const rows=await D.rows(b);if(rows.length){M(geo,st,'list.rows',rows.length);M(geo,st,'list.minH',Math.min(...rows.map(r=>r.h)));M(geo,st,'list.maxH',Math.max(...rows.map(r=>r.h)));M(geo,st,'list.w',rows[0].w);
      const trunc=rows.filter(r=>r.nameSW>r.nameCW+1);M(geo,st,'list.truncNames',trunc.length+'/'+rows.length+(trunc.length?' '+trunc.slice(0,4).map(r=>r.name+' '+r.nameSW+'/'+r.nameCW).join('; '):''));
      const tIdea=rows.filter(r=>r.ideaSW>r.ideaCW+1);M(geo,st,'list.truncIdeas',tIdea.length+'/'+rows.length);M(geo,st,'list.first',rows[0].name);M(geo,st,'list.lastBottom',rows[rows.length-1].y+rows[rows.length-1].h);}
    const tiles=btns.filter(x=>/Openings|Gambits|Endgames|Tactics/.test(x.t));if(tiles.length)M(geo,st,'tiles',tiles.map(x=>x.t.split('\n')[0]+' '+x.w+'x'+x.h).join('|'));
    const sc=await D.scrollers(b);M(geo,st,'scrollers',sc.map(s=>s.pos+' sh'+s.sh+'/ch'+s.ch).join('; ')||'none');
    M(geo,st,'page.scrollH',await b.page.evaluate(()=>document.documentElement.scrollHeight));}
  if(st==='intro'){const card=await D.textRect(b,/^Got it/);if(card){M(geo,st,'intro.gotit',card.w+'x'+card.h+'@'+card.y);}
    const cr=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('button')].find(x=>/^Got it/.test((x.innerText||'').trim()));if(!g)return null;let p=g;for(let i=0;i<6&&p.parentElement;i++){p=p.parentElement;const s=getComputedStyle(p);if(s.position==='fixed'||s.position==='absolute')break;}const r=p.getBoundingClientRect();return {top:Math.round(r.top),h:Math.round(r.height),bottom:Math.round(r.bottom),sh:p.scrollHeight,ch:p.clientHeight};});
    if(cr){M(geo,st,'intro.card',cr.top+'..'+cr.bottom+' h'+cr.h);M(geo,st,'intro.card.scroll',cr.sh+'/'+cr.ch);}}
  if(SHEET.test(st)){const sheet=await b.page.evaluate(()=>{const ids=['lesson-sheet-lines','lesson-sheet-nav'];const o={};for(const id of ids){const e=document.querySelector('[data-ct="'+id+'"]');if(!e)continue;const r=e.getBoundingClientRect();o[id]=Math.round(r.width)+'x'+Math.round(r.height)+'@'+Math.round(r.left)+','+Math.round(r.top)+' btns:'+[...e.querySelectorAll('button')].map(x=>{const rr=x.getBoundingClientRect();return ((x.innerText||'').replace(/\s+/g,' ').trim().slice(0,22)||'?')+' '+Math.round(rr.width)+'x'+Math.round(rr.height)+(x.disabled?' dis':'');}).join(',');}
      // the sheet container: the fixed box holding lesson-sheet-nav
      const nav=document.querySelector('[data-ct="lesson-sheet-nav"]');let p=nav;while(p&&getComputedStyle(p).position!=='fixed')p=p.parentElement;if(p){const r=p.getBoundingClientRect();o.sheet=Math.round(r.top)+'..'+Math.round(r.bottom)+' sh'+p.scrollHeight+'/ch'+p.clientHeight;}return o;});
    for(const k in sheet)M(geo,st,'sheet.'+k,sheet[k]);}
  if(/^practice/.test(st)||/practice-(m0|correct)$/.test(st)){const hl=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!g)return null;const kids=[...g.children].slice(0,64);const cols={};const bg=kids.map(k=>getComputedStyle(k).backgroundColor);bg.forEach(c=>cols[c]=(cols[c]||0)+1);const top2=Object.entries(cols).sort((a,b2)=>b2[1]-a[1]).slice(0,2).map(x=>x[0]);const bl=kids[56]?(kids[56].innerText||''):'';const flip=/h/.test(bl);return kids.map((k,i)=>({i,c:bg[i],piece:!!k.querySelector('svg,img')})).filter(x=>!top2.includes(x.c)).map(x=>{const col=x.i%8,row=Math.floor(x.i/8);const f=flip?7-col:col,r=flip?row:7-row;return String.fromCharCode(97+f)+(r+1)+(x.piece?'*':'');}).join(',');});M(geo,st,'board.marked',hl||'none');}
  if(st==='demo-copy'){M(geo,st,'copy.label',(by(/Copy|Copied/)[0]||{}).t||'none');}
  if(st==='demo-analyze'){M(geo,st,'inLesson',await D.inLesson(b));M(geo,st,'nav',btns.filter(x=>/^(‹|←|✕|⌂|Home|rev-back|Back)/.test(x.t)).map(x=>x.t).join('|')||'none');M(geo,st,'cts',(await b.cts()).slice(0,8).join(' '));}
  if(st==='close'){M(geo,st,'onList',(await D.rows(b)).length);M(geo,st,'inLesson',await D.inLesson(b));}
  await b.shot(geo+'-'+st);
}

L.run(async()=>{
  for(const [geo,states] of PLAN){
    let b=await L.launch({geo,name:'audit-lesson-'+geo});await b.open();
    M(geo,'boot','stamp',await b.stamp());
    const nn=await b.page.evaluate(()=>{const LIB=window.CTLESSONS;if(!LIB)return null;const groups=Array.isArray(LIB)?{all:LIB}:LIB;const notes=[];for(const g in groups){const arr=groups[g];if(!Array.isArray(arr))continue;for(const les of arr){const ns=les.notes||les.note||[];const list=Array.isArray(ns)?ns:Object.values(ns);list.forEach((n,i)=>{if(typeof n==='string'&&n)notes.push({g,name:les.name,i,n});});if(Array.isArray(les.vars))for(const v of les.vars){const vn=v.notes||[];(Array.isArray(vn)?vn:Object.values(vn)).forEach((n,i)=>{if(typeof n==='string'&&n)notes.push({g,name:les.name+' / '+(v.name||'var'),i,n});});}}}
      const box=document.createElement('div');box.setAttribute('style','position:fixed;left:0;top:0;width:368px;margin:0;padding:7px 11px;height:75px;box-sizing:border-box;overflow:hidden;font-size:14.5px;line-height:1.32;text-align:left;visibility:hidden');box.style.width=Math.min(368,innerWidth-8)+'px';const inner=document.createElement('div');inner.setAttribute('style','display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden');box.appendChild(inner);document.body.appendChild(box);
      const over=[];for(const x of notes){inner.innerHTML='';const b1=document.createElement('span');b1.style.fontWeight='700';b1.textContent=(Math.ceil((x.i+1)/2))+'. '+'Nxf7';const s2=document.createElement('span');s2.textContent=' — '+x.n;inner.appendChild(b1);inner.appendChild(s2);if(inner.scrollHeight>inner.clientHeight+1)over.push(x.name+'#'+(x.i+1)+' len'+x.n.length);}
      box.remove();return {total:notes.length,over:over.length,list:over.slice(0,6),longest:notes.reduce((a,x)=>x.n.length>a.len?{len:x.n.length,name:x.name+'#'+(x.i+1)}:a,{len:0})};});
    if(nn){M(geo,'boot','notes.total',nn.total);M(geo,'boot','notes.over3lines',nn.over);M(geo,'boot','notes.over3.first',nn.list.join('; '));M(geo,'boot','notes.longest',nn.longest.name+' '+nn.longest.len);}else M(geo,'boot','notes','CTLESSONS not found');
    for(const st of states){
      const errsBefore=b.errs.length;
      try{await D.states[st](b);await b.settle(250);await measure(b,geo,st);}
      catch(e){M(geo,st,'DRIVE_ERROR',String(e).split('\n')[0].slice(0,200));try{await b.shot(geo+'-'+st+'-error');}catch(e2){}}
      if(SHEET.test(st))await D.closeSheet(b);
      if(b.errs.length>errsBefore)M(geo,st,'newErrs',b.errs.slice(errsBefore,errsBefore+3));
      if(st==='demo-analyze'){await b.open();}
    }
    // invariants for this geometry
    const S=R[geo]||{};const boardStates=Object.keys(S).filter(s=>S[s]['board.w']!=null&&!/^k11|analyze|^tactics$/.test(s));   // tactics = the Tactics landing, its own screen
    const ws=[...new Set(boardStates.map(s=>S[s]['board.w']))],tops=[...new Set(boardStates.map(s=>S[s]['board.top']))];
    L.say(ws.length===1,geo+': one board width across '+boardStates.length+' lesson states',ws.join(','));
    L.say(tops.length===1,geo+': one board top across the lesson states',tops.join(','));
    const overs=boardStates.filter(s=>S[s]['over.over']>0);L.say(overs.length===0,geo+': over<=0 on every board state',overs.map(s=>s+'='+S[s]['over.over']).join(' ')||'all <=0');
    L.say(b.errs.length===0,geo+': zero app console errors',b.errs.slice(0,3));
    const de=Object.keys(S).filter(s=>S[s].DRIVE_ERROR);L.say(de.length===0,geo+': every state reached',de.join(',')||'all');
    await b.close();
  }
},'AUDIT-LESSON');
