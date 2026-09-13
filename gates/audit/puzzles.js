// gates/audit/puzzles.js - the audit of the Puzzles screen on the live bundle (HANDOFF 0c): every state of
// gates/drive/puzzles.js at Kunal's geometry (375x679) and 390x844, the width/height-dependent states also at
// 320x568 and 430x932. One line per measurement:  MEASURE <geo> <state> <metric>=<value>
// and one PNG per state in gates/shots/audit/puzzles/<geo>-<state>.png. PASS/FAIL lines at the end assert the
// board-screen invariants (one board top and width across the browse states, over<=0, zero app errors) and
// re-measure the known items: A-10 (Next inert before solving), X-07 (wrong-move line clipped), Z-04 (blank
// verdict box while a hint shows), A-06/Z-01 (hint header unclipped at 320/375/390), A-11 (pz-bottom targets),
// k9 (verdict text overflowing the one-line box).
//   cd /home/user/chess-trainer && timeout 900 node gates/audit/puzzles.js
'use strict';
const path=require('path'),fs=require('fs');
process.env.CT_SHOTS=path.join(__dirname,'..','shots','audit','puzzles');
const L=require('../lib');const Z=require('../drive/puzzles');
const ALL=Object.keys(Z.states);
const WIDTH_STATES=['roadmap','roadmap-bottom','train','train-fail','train-hint','train-solved','long-hint','long-solved','long-fail','rankup'];
const PLAN=[['kunal',ALL],['390',ALL],['se',WIDTH_STATES],['430',WIDTH_STATES]];
const BROWSE=/^(train|free-play|long-|rankup|a06|daily3-solved)/;
const R={};
const M=(geo,st,k,v)=>{R[geo]=R[geo]||{};R[geo][st]=R[geo][st]||{};R[geo][st][k]=v;console.log('MEASURE '+geo+' '+st+' '+k+'='+(typeof v==='object'?JSON.stringify(v):v));};
const r1=(x)=>Math.round(x*10)/10;

// the browse view's chrome: the header row (‹ Roadmap | n / 890 · rating | tier · ✓ n), the goal card, the verdict box, the hint header
async function chrome(b){return b.page.evaluate(()=>{
  const q=(s)=>document.querySelector(s);const rc=(e)=>{const r=e.getBoundingClientRect();return {x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10};};
  const top=q('[data-ct="pz-top"]'),bot=q('[data-ct="pz-bottom"]'),hh=q('[data-ct="pz-hint-head"]');const o={};
  if(top){o.top=rc(top);const rows=[...top.children].filter(c=>getComputedStyle(c).position!=='fixed');
    const head=rows[0];if(head){o.head=rc(head);o.head.text=(head.innerText||'').replace(/\s+/g,' ').trim();o.head.sw=head.scrollWidth;o.head.cw=head.clientWidth;
      const kids=[...head.children].map(k=>{const r=k.getBoundingClientRect();return {t:(k.innerText||'').replace(/\s+/g,' ').trim().slice(0,40),x:Math.round(r.left*10)/10,right:Math.round(r.right*10)/10,w:Math.round(r.width*10)/10,sw:k.scrollWidth,cw:k.clientWidth};});
      o.head.kids=kids;o.head.overRight=Math.max(0,...kids.map(k=>Math.round((k.right-(o.head.x+o.head.w))*10)/10));const m=o.head.text.match(/(\d+) \/ (\d+)/);o.idx=m?+m[1]:null;o.total=m?+m[2]:null;}
    const goal=rows.find(c=>/🎯/.test(c.innerText||''));if(goal){o.goal=rc(goal);o.goal.text=(goal.innerText||'').replace(/\s+/g,' ').trim().slice(0,90);const gl=[...goal.querySelectorAll('div')].find(d=>/^🎯/.test((d.innerText||'').trim()));if(gl){o.goal.titleLines=Math.round(gl.getBoundingClientRect().height/parseFloat(getComputedStyle(gl).lineHeight||getComputedStyle(gl).fontSize)*10)/10;o.goal.titleH=Math.round(gl.getBoundingClientRect().height*10)/10;}}
    const box=goal?rows[rows.indexOf(goal)+1]:null;if(box){o.box=rc(box);o.box.ch=box.clientHeight;o.box.sh=box.scrollHeight;o.box.kids=box.children.length;o.box.text=(box.innerText||'').replace(/\s+/g,' ').trim().slice(0,120);}
  }
  if(hh){o.hint=rc(hh);const st=getComputedStyle(hh);o.hint.text=(hh.innerText||'').replace(/\s+/g,' ').trim();o.hint.len=o.hint.text.length;o.hint.fs=st.fontSize;o.hint.lh=parseFloat(st.lineHeight);o.hint.sh=hh.scrollHeight;o.hint.ch=hh.clientHeight;o.hint.lines=Math.round(hh.scrollHeight/parseFloat(st.lineHeight)*10)/10;o.hint.clipped=hh.scrollHeight>hh.clientHeight+1;
    const rg=document.createRange();rg.selectNodeContents(hh);const rr=rg.getBoundingClientRect();o.hint.textBottom=Math.round(rr.bottom*10)/10;o.hint.boxBottom=o.hint.bottom;o.hint.textOver=Math.max(0,Math.round((rr.bottom-o.hint.bottom)*10)/10);}
  if(bot){o.bot=rc(bot);}
  // the board cells e8/f8 (kids 4 and 5 of the grid when White is at the bottom) for the auto-played reply
  const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));
  if(g){const k=[...g.children];const cell=(i)=>{const im=k[i]&&k[i].querySelector('img');return im?(im.getAttribute('src')||'').split('/').pop().slice(0,12):'-';};o.cells={e8:cell(4),f8:cell(5),e1:cell(60),d8:cell(3)};
    const cols={};k.slice(0,64).forEach(c=>{const bg=getComputedStyle(c).backgroundColor;cols[bg]=(cols[bg]||0)+1;});const ent=Object.entries(cols).sort((a,b)=>b[1]-a[1]);o.board={colours:ent.length,marked:ent.slice(2).reduce((a,x)=>a+x[1],0)};}
  const ov=[...document.querySelectorAll('div')].find(d=>/RANK UP!/.test(d.innerText||'')&&d.children.length<8&&d.getBoundingClientRect().width<400&&d.getBoundingClientRect().width>200);
  if(ov)o.rankup=rc(ov);
  return o;});}

async function measure(b,geo,st){
  const m=await b.metrics();const isRoad=/^(roadmap|train-back|daily3$)/.test(st);
  if(m.board){M(geo,st,'board.w',m.board.w);M(geo,st,'board.top',m.board.top);M(geo,st,'board.left',m.board.left);M(geo,st,'board.flip',m.board.flip);M(geo,st,'band.right',r1(m.vw-m.board.left-m.board.w));}
  else M(geo,st,'board','none');
  M(geo,st,'over.over',m.over.over);M(geo,st,'over.bottom',m.over.bottom);M(geo,st,'scrollY',m.over.scrollY);M(geo,st,'docScroll',m.over.docScroll);
  M(geo,st,'errs',b.errs.length);if(b.errs.length)M(geo,st,'errs.text',b.errs.slice(0,3));
  const btns=await Z.btnRects(b);M(geo,st,'buttons',btns.map(x=>x.t+(x.dis?'(dis)':'')).join('|'));
  const by=(re)=>btns.find(x=>re.test(x.t));
  const tabbar=await b.tabBarVisible();M(geo,st,'tabbar',tabbar);const tb=by(/^Home$/);if(tb)M(geo,st,'tabbar.top',tb.y);
  if(isRoad){
    const sb=await Z.scrollBox(b);M(geo,st,'road.docScrollH',sb.doc.sh);M(geo,st,'road.docClientH',sb.doc.ch);M(geo,st,'road.scrollTop',sb.doc.st);M(geo,st,'road.boxes',sb.boxes.map(x=>x.pos+' sh'+x.sh+'/ch'+x.ch+' st'+x.st).join('; ')||'none');
    const menu=by(/^☰$/);if(menu)M(geo,st,'tap.menu',menu.w+'x'+menu.h);
    const start=by(/^▶ (Start training|Train next puzzle)$/);if(start){M(geo,st,'start.label',start.t);M(geo,st,'start.rect',start.w+'x'+start.h+'@'+start.x+','+start.y);M(geo,st,'start.belowFold',Math.max(0,r1(start.y+start.h-b.geo.h)));}
    const nodes=btns.filter(x=>x.w>=80&&x.h>=80);M(geo,st,'nodes',nodes.map(x=>x.t+' '+x.w+'x'+x.h+'@'+x.y+(x.dis?' dis':'')).join('; '));
    // where is Free play? (its document y = viewport y + scroll)
    const fp=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(x=>/^🧩 Free play/.test((x.innerText||'').trim()));if(!e)return null;const r=e.getBoundingClientRect();const de=document.scrollingElement||document.documentElement;return {vy:Math.round(r.top),docY:Math.round(r.top+de.scrollTop),w:Math.round(r.width),h:Math.round(r.height),onScreen:r.top>=0&&r.bottom<=innerHeight};});
    M(geo,st,'freeplay',fp?fp.w+'x'+fp.h+' viewportY'+fp.vy+' docY'+fp.docY+(fp.onScreen?' ON-SCREEN':' OFF-SCREEN'):'none');
    // is the Free play button covered? hit-test its centre and its top edge; how far does the road panel (the div with the
    // scenery, the previous sibling that ends past the button's top) reach over it; the button's own opacity
    if(fp&&fp.onScreen){const hit=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('button')].find(x=>/^🧩 Free play/.test((x.innerText||'').trim()));const r=e.getBoundingClientRect();
      const at=(x,y)=>{const t=document.elementFromPoint(x,y);return t?(e.contains(t)?'button':(t.tagName+(t.getAttribute('data-ct')?'#'+t.getAttribute('data-ct'):'')+' '+Math.round(t.getBoundingClientRect().width)+'x'+Math.round(t.getBoundingClientRect().height))):'none';};
      const centre=at(r.left+r.width/2,r.top+r.height/2),topEdge=at(r.left+r.width/2,r.top+3),bottomEdge=at(r.left+r.width/2,r.bottom-3);
      // every element that overlaps the button's box and is painted after it (later in DOM or higher z), not an ancestor/descendant
      const over=[...document.querySelectorAll('div')].filter(d=>{if(d===e||d.contains(e)||e.contains(d))return false;const q=d.getBoundingClientRect();if(q.width<50||q.height<20)return false;const ov=Math.min(q.bottom,r.bottom)-Math.max(q.top,r.top);if(ov<=0)return false;const st=getComputedStyle(d);if(st.pointerEvents==='none'&&!st.backgroundImage&&st.backgroundColor==='rgba(0, 0, 0, 0)')return false;return (e.compareDocumentPosition(d)&Node.DOCUMENT_POSITION_FOLLOWING)&&(st.backgroundImage!=='none'||st.backgroundColor!=='rgba(0, 0, 0, 0)'||st.boxShadow!=='none');}).map(d=>{const q=d.getBoundingClientRect();return Math.round(q.width)+'x'+Math.round(q.height)+'@'+Math.round(q.top)+' overlap'+Math.round(Math.min(q.bottom,r.bottom)-Math.max(q.top,r.top))+'px z'+getComputedStyle(d).zIndex;});
      // the road panel: the largest earlier sibling-ish element whose bottom edge lies inside the button
      const road=[...document.querySelectorAll('div')].filter(d=>!d.contains(e)&&!e.contains(d)&&d.getBoundingClientRect().width>300&&d.getBoundingClientRect().height>300&&d.getBoundingClientRect().bottom>r.top&&d.getBoundingClientRect().top<r.top).map(d=>{const q=d.getBoundingClientRect();return {bottom:Math.round(q.bottom*10)/10,reach:Math.round((q.bottom-r.top)*10)/10,h:Math.round(q.height),ovf:getComputedStyle(d).overflow,z:getComputedStyle(d).zIndex,pos:getComputedStyle(d).position};});
      // a mask or opacity on an ancestor dims the button without any element covering it
      const anc=[];let a=e.parentElement;while(a&&a!==document.body&&anc.length<5){const st=getComputedStyle(a);const q=a.getBoundingClientRect();const mask=st.maskImage&&st.maskImage!=='none'?st.maskImage:(st.webkitMaskImage&&st.webkitMaskImage!=='none'?st.webkitMaskImage:'none');anc.push(Math.round(q.width)+'x'+Math.round(q.height)+'@'+Math.round(q.top)+' op'+st.opacity+' mask:'+mask.slice(0,70));a=a.parentElement;}
      return {centre,topEdge,bottomEdge,opacity:getComputedStyle(e).opacity,btnTop:Math.round(r.top*10)/10,btnBottom:Math.round(r.bottom*10)/10,over,road,anc};});
      M(geo,st,'freeplay.hit',hit.centre+' / top:'+hit.topEdge+' / bottom:'+hit.bottomEdge);M(geo,st,'freeplay.opacity',hit.opacity);M(geo,st,'freeplay.overlaps',hit.over.join('; ')||'none');M(geo,st,'freeplay.roadReach',hit.road.map(x=>'bottom'+x.bottom+' reach'+x.reach+'px h'+x.h+' '+x.pos+' z'+x.z).join('; ')||'none');M(geo,st,'freeplay.ancestors',hit.anc.join(' > '));
      // the label's brightness against the next button's (a masked/faded label reads as disabled): luminance of the painted pixels
      const png=await b.page.screenshot();const lum=await b.page.evaluate(async(b64)=>{const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);
        const btns=[...document.querySelectorAll('button')].filter(e=>/^(🧩 Free play|🌐 Online)/.test((e.innerText||'').trim()));return btns.map(e=>{const r=e.getBoundingClientRect();const d=x.getImageData(Math.round(r.left+60),Math.round(r.top+6),Math.max(1,Math.round(r.width-120)),Math.max(1,Math.round(r.height-12))).data;let s=0,mx=0,n=0;for(let i=0;i<d.length;i+=4){const l=0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2];s+=l;if(l>mx)mx=l;n++;}return (e.innerText||'').trim().slice(0,12)+' mean'+Math.round(s/n)+' max'+Math.round(mx);});},png.toString('base64'));
      M(geo,st,'freeplay.luminance',lum.join(' | '));}
    const other=btns.filter(x=>/^(🌐 Online|Unlock)/.test(x.t));if(other.length)M(geo,st,'road.tail',other.map(x=>x.t.slice(0,22)+' '+x.w+'x'+x.h+'@'+x.y).join('; '));
    // the roadmap's last content vs the tab bar (is anything hidden under the fixed bar at the end?)
    if(st==='roadmap-bottom'&&tb){const lastBottom=Math.max(...btns.filter(x=>!/^(Home|Discover|Puzzles|Review|Play)$/.test(x.t)).map(x=>x.y+x.h));M(geo,st,'road.lastBtnBottom',lastBottom);M(geo,st,'road.underTabbar',Math.max(0,r1(lastBottom-tb.y)));}
    const dcard=await b.page.evaluate(()=>{const e=[...document.querySelectorAll('div')].find(d=>/Daily goal/.test(d.innerText||'')&&d.getBoundingClientRect().height<60&&d.getBoundingClientRect().height>10);if(!e)return null;const r=e.getBoundingClientRect();return Math.round(r.top)+' '+Math.round(r.width)+'x'+Math.round(r.height)+' '+(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,30);});if(dcard)M(geo,st,'road.dailygoal',dcard);
  }
  if(BROWSE.test(st)||m.board){
    const c=await chrome(b);
    if(c.top){M(geo,st,'pz-top.h',c.top.h);M(geo,st,'pz-top.y',c.top.y);}
    if(c.head){M(geo,st,'head.text',c.head.text);M(geo,st,'head.h',c.head.h);M(geo,st,'head.overRight',c.head.overRight);M(geo,st,'head.kids',c.head.kids.map(k=>k.t+' '+k.x+'..'+k.right+(k.sw>k.cw+1?' CLIP'+k.sw+'/'+k.cw:'')).join('; '));M(geo,st,'pz.idx',c.idx);M(geo,st,'pz.total',c.total);}
    if(c.goal){M(geo,st,'goal.rect',c.goal.w+'x'+c.goal.h+'@'+c.goal.y);M(geo,st,'goal.text',c.goal.text);M(geo,st,'goal.titleLines',c.goal.titleLines);}
    if(c.box){M(geo,st,'box.h',c.box.h);M(geo,st,'box.y',c.box.y);M(geo,st,'box.kids',c.box.kids);M(geo,st,'box.text',c.box.text||'(blank)');}
    if(c.goal&&m.board)M(geo,st,'gap.goalToBoard',r1(m.board.top-c.goal.bottom));
    if(c.box&&m.board)M(geo,st,'gap.boxToBoard',r1(m.board.top-c.box.bottom));
    const msg=await Z.msg(b);
    if(msg){M(geo,st,'msg.text',msg.text);M(geo,st,'msg.len',msg.text.length);M(geo,st,'msg.rect',msg.w+'x'+msg.h+'@'+msg.top);M(geo,st,'msg.sw/cw',msg.sw+'/'+msg.cw);M(geo,st,'msg.clippedPx',Math.max(0,msg.sw-msg.cw));M(geo,st,'msg.fs',msg.fs);M(geo,st,'msg.ws',msg.ws);}
    else M(geo,st,'msg','none');
    if(c.hint){M(geo,st,'hint.text',c.hint.text);M(geo,st,'hint.len',c.hint.len);M(geo,st,'hint.rect',c.hint.w+'x'+c.hint.h+'@'+c.hint.y);M(geo,st,'hint.fs',c.hint.fs);M(geo,st,'hint.lines',c.hint.lines);M(geo,st,'hint.sh/ch',c.hint.sh+'/'+c.hint.ch);M(geo,st,'hint.clipped',c.hint.clipped);M(geo,st,'hint.textOver',c.hint.textOver);}
    if(c.bot){M(geo,st,'pz-bottom.y',c.bot.y);M(geo,st,'pz-bottom.h',c.bot.h);M(geo,st,'pz-bottom.bottom',c.bot.bottom);M(geo,st,'pz-bottom.belowFold',Math.max(0,r1(c.bot.bottom-b.geo.h)));if(tb)M(geo,st,'gap.rowToTabbar',r1(tb.y-c.bot.bottom));}
    const row=btns.filter(x=>/^(Previous puzzle|💡 Hint|👁 Show|↺ Reset|Next puzzle|Next ›)$/.test(x.t));
    if(row.length){M(geo,st,'row.n',row.length);M(geo,st,'row.labels',row.map(x=>x.t).join(' '));M(geo,st,'row.minH',Math.min(...row.map(x=>x.h)));M(geo,st,'row.minW',Math.min(...row.map(x=>x.w)));M(geo,st,'row.rects',row.map(x=>x.w+'x'+x.h+'@'+x.x).join(' '));}
    const back=by(/^(‹ Roadmap|‹)$/);if(back)M(geo,st,'tap.back',back.t+' '+back.w+'x'+back.h);
    if(c.cells)M(geo,st,'cells',c.cells.e8+' '+c.cells.f8+' '+c.cells.d8+' '+c.cells.e1);
    if(c.board)M(geo,st,'board.markedCells',c.board.marked);
    if(c.rankup)M(geo,st,'rankup.overlay',c.rankup.w+'x'+c.rankup.h+'@'+c.rankup.y);
    M(geo,st,'sig',(await Z.sig(b)).replace(/[^|]/g,'').length+':'+require('crypto').createHash('md5').update(await Z.sig(b)).digest('hex').slice(0,8));
  }
  if(/^daily3/.test(st)){const d=await b.page.evaluate(()=>localStorage.getItem('ct_daily3'));M(geo,st,'ct_daily3',d);}
  await b.shot(geo+'-'+st);
}

L.run(async()=>{
  for(const [geo,states] of PLAN){
    let b=await L.launch({geo,name:'audit-puzzles-'+geo});await b.open();
    M(geo,'boot','stamp',await b.stamp());
    for(const st of states){
      const errsBefore=b.errs.length;
      try{await Z.states[st](b);await b.settle(250);await measure(b,geo,st);}
      catch(e){M(geo,st,'DRIVE_ERROR',String(e).split('\n')[0].slice(0,200));try{await b.shot(geo+'-'+st+'-error');}catch(e2){}}
      if(b.errs.length>errsBefore)M(geo,st,'newErrs',b.errs.slice(errsBefore,errsBefore+3));
    }
    await b.close();
  }
  // ---- invariants and the known items ----
  const g=(geo,st,k)=>(R[geo]&&R[geo][st]&&R[geo][st][k]);
  const EXP={kunal:{w:375,top:181.5},'390':{w:390,top:null}};
  for(const geo of ['kunal','390','se','430']){
    const list=Object.keys(R[geo]||{}).filter(s=>BROWSE.test(s)&&g(geo,s,'board.w')!=null);
    const ws=[...new Set(list.map(s=>g(geo,s,'board.w')))],ts=[...new Set(list.map(s=>g(geo,s,'board.top')))];
    L.say(ws.length===1,geo+': puzzle board has ONE width across '+list.length+' browse states',ws);
    L.say(ts.length===1,geo+': puzzle board has ONE top across '+list.length+' browse states',ts);
    if(EXP[geo]&&EXP[geo].w)L.say(ws[0]===EXP[geo].w,geo+': puzzle board width is '+EXP[geo].w+' (HANDOFF)',ws);
    const overs=list.map(s=>[s,g(geo,s,'over.over')]).filter(x=>x[1]>0);
    L.say(overs.length===0,geo+': over<=0 on every board state',overs);
    const errs=Object.entries(R[geo]||{}).filter(([s,v])=>v.errs>0).map(([s,v])=>s+':'+v.errs);
    L.say(errs.length===0,geo+': zero app console errors in every state',errs);
    const below=list.map(s=>[s,g(geo,s,'pz-bottom.belowFold')]).filter(x=>x[1]>0);
    L.say(below.length===0,geo+': the pz-bottom row is above the fold in every browse state',below);
    // A-11: targets on the primary row and the back button
    const small=list.map(s=>[s,g(geo,s,'row.minH'),g(geo,s,'row.minW')]).filter(x=>x[1]!=null&&(x[1]<40||x[2]<40));
    L.say(small.length===0,geo+': every pz-bottom target >= 40px (A-11)',{minH:g(geo,'train','row.minH'),minW:g(geo,'train','row.minW'),rects:g(geo,'train','row.rects'),small});
    const menu=g(geo,'roadmap','tap.menu');L.say(menu&&+menu.split('x')[0]>=40&&+menu.split('x')[1]>=40,geo+': roadmap ☰ tap target >= 40px (A-11)',menu);
    // A-10: Next before solving
    L.say(g(geo,'train-next-before','pz.idx')!==g(geo,'train','pz.idx'),geo+': Next chevron BEFORE solving advances the puzzle (A-10)',{before:g(geo,'train','pz.idx'),afterNext:g(geo,'train-next-before','pz.idx'),sigBefore:g(geo,'train','sig'),sigAfter:g(geo,'train-next-before','sig'),freePlayNext:g(geo,'free-play-next','pz.idx')});
    L.say(g(geo,'train-solved-next','pz.idx')!==g(geo,'train-solved','pz.idx'),geo+': Next › AFTER solving advances the puzzle',{solved:g(geo,'train-solved','pz.idx'),afterNext:g(geo,'train-solved-next','pz.idx')});
    // X-07 and k9: the one-line verdict box
    for(const s of ['train-fail','train-step1','train-solved','train-show','long-fail','long-solved','rankup']){const cp=g(geo,s,'msg.clippedPx');if(cp==null)continue;L.say(cp===0,geo+' '+s+': verdict text fits the box ('+(s==='train-fail'?'X-07':'k9')+')',{clippedPx:cp,'sw/cw':g(geo,s,'msg.sw/cw'),len:g(geo,s,'msg.len'),boxH:g(geo,s,'box.h'),text:g(geo,s,'msg.text')});}
    // Z-04: the verdict box while the hint shows
    for(const s of ['train-hint','long-hint']){if(g(geo,s,'box.h')==null)continue;L.say(g(geo,s,'box.kids')>0,geo+' '+s+': the verdict box is not blank while a hint shows (Z-04)',{boxH:g(geo,s,'box.h'),kids:g(geo,s,'box.kids'),gapGoalToBoard:g(geo,s,'gap.goalToBoard'),gapNoHint:g(geo,'train','gap.goalToBoard')});}
    // A-06/Z-01: the hint header
    for(const s of ['train-hint','long-hint','a06']){if(g(geo,s,'hint.len')==null)continue;L.say(g(geo,s,'hint.clipped')===false&&g(geo,s,'hint.lines')<=3&&g(geo,s,'hint.textOver')===0,geo+' '+s+': hint header unclipped, <= 3 lines (A-06/Z-01)',{len:g(geo,s,'hint.len'),lines:g(geo,s,'hint.lines'),'sh/ch':g(geo,s,'hint.sh/ch'),textOver:g(geo,s,'hint.textOver'),fs:g(geo,s,'hint.fs'),boardTop:g(geo,s,'board.top'),boardTopNoHint:g(geo,'train','board.top')});}
    // the header row's right counter
    const clipHead=list.map(s=>[s,g(geo,s,'head.overRight')]).filter(x=>x[1]>0);
    L.say(clipHead.length===0,geo+': the browse header row keeps its counters inside the row',clipHead.map(x=>x[0]+':'+x[1]+'px '+g(geo,x[0],'head.kids')));
    // Reset restores the start position and clears the message
    L.say(g(geo,'train-fail-reset','sig')===g(geo,'train','sig')&&g(geo,'train-fail-reset','msg')==='none',geo+': ↺ Reset restores the position and clears the ✗ line',{sigReset:g(geo,'train-fail-reset','sig'),sigStart:g(geo,'train','sig'),msg:g(geo,'train-fail-reset','msg')});
    // the reply auto-plays after the first correct move
    L.say(/^-\s/.test(String(g(geo,'train-step1','cells')))&&!/^-\s-/.test(String(g(geo,'train-step1','cells'))),geo+': Black\'s reply Rf8 is auto-played after Re8+ (e8 empty, f8 occupied)',g(geo,'train-step1','cells'));
    if(g(geo,'daily3-solved','ct_daily3')!=null)L.say(/"puz":1/.test(String(g(geo,'daily3-solved','ct_daily3'))),geo+': a training solve from the Daily 3 card bumps ct_daily3.puz to 1',g(geo,'daily3-solved','ct_daily3'));
    if(g(geo,'daily3','board')!=null)L.say(g(geo,'daily3','board')==='none'&&/Start training/.test(String(g(geo,'daily3','buttons'))),geo+': the Daily 3 card (lesson done) lands on the puzzle roadmap, not on a puzzle',{board:g(geo,'daily3','board'),start:g(geo,'daily3','start.label')});
    const lum=String(g(geo,'roadmap-bottom','freeplay.luminance')||'');const lm=lum.match(/Free play[^|]*max(\d+)[^|]*\|[^|]*max(\d+)/);
    if(lm)L.say(+lm[1]>=+lm[2]*0.6,geo+': the Free play label is as bright as its neighbour (not faded by the road mask)',{luminance:lum,ancestors:g(geo,'roadmap-bottom','freeplay.ancestors'),hit:g(geo,'roadmap-bottom','freeplay.hit')});
    if(g(geo,'roadmap','freeplay'))L.say(/OFF-SCREEN/.test(g(geo,'roadmap','freeplay'))&&/ON-SCREEN/.test(String(g(geo,'roadmap-bottom','freeplay'))),geo+': Free play is below the fold on the roadmap and reachable by scrolling',{top:g(geo,'roadmap','freeplay'),bottom:g(geo,'roadmap-bottom','freeplay'),roadScrollH:g(geo,'roadmap','road.docScrollH')});
  }
  fs.writeFileSync(path.join(process.env.CT_SHOTS,'audit-puzzles.json'),JSON.stringify(R,null,1));
  L.note('numbers written to '+path.join(process.env.CT_SHOTS,'audit-puzzles.json'));
},'AUDIT-PUZZLES');
