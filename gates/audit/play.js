// gates/audit/play.js - the audit of the Play screen on the live bundle (HANDOFF 0c): every state of
// gates/drive/play.js at Kunal's geometry (375x679, insets 51/31) and 390x844, the width-dependent states also
// at 320x568 and 430x932. One line per measurement:  MEASURE <geo> <state> <metric>=<value>
// and one PNG per state in gates/shots/audit/play/<geo>-<state>.png. PASS/FAIL lines at the end assert the
// board-screen invariants (one board top and width across a screen's states, over<=0, zero app errors).
//   cd /home/user/chess-trainer && timeout 900 node gates/audit/play.js
'use strict';
const path=require('path');
process.env.CT_SHOTS=path.join(__dirname,'..','shots','audit','play');
const L=require('../lib');const P=require('../drive/play');
const ALL=Object.keys(P.states);
const WIDTH_STATES=['setup','setup-bot-viktor','setup-passplay','cpu-m0','cpu-4ply','pp-m0','pp-mate'];
const PLAN=[['kunal',ALL],['390',ALL],['se',WIDTH_STATES],['430',WIDTH_STATES]];
const R={};
const M=(geo,st,k,v)=>{R[geo]=R[geo]||{};R[geo][st]=R[geo][st]||{};R[geo][st][k]=v;console.log('MEASURE '+geo+' '+st+' '+k+'='+(typeof v==='object'?JSON.stringify(v):v));};
const NAV=/^(⌂|‹ Home|← Home|Home|✕|←|Back)$/;

async function measure(b,geo,st){
  const m=await b.metrics();const isSetup=/^setup/.test(st);
  if(isSetup){M(geo,st,'behind.over',m.over.over);}
  else if(m.board){M(geo,st,'board.w',m.board.w);M(geo,st,'board.top',m.board.top);M(geo,st,'board.left',m.board.left);M(geo,st,'board.flip',m.board.flip);M(geo,st,'band.right',Math.round((m.vw-m.board.left-m.board.w)*10)/10);}
  else M(geo,st,'board','none');
  if(!isSetup){M(geo,st,'over.over',m.over.over);M(geo,st,'over.bottom',m.over.bottom);M(geo,st,'scrollY',m.over.scrollY);M(geo,st,'docScroll',m.over.docScroll);}
  M(geo,st,'errs',b.errs.length);if(b.errs.length)M(geo,st,'errs.text',b.errs.slice(0,3));
  const btns=await P.btnRects(b);M(geo,st,'buttons',btns.map(x=>x.t).join('|'));
  const by=(t)=>btns.find(x=>x.t===t);
  for(const t of ['⌂','☰']){const r=by(t);if(r)M(geo,st,'tap.'+(t==='⌂'?'home':'menu'),r.w+'x'+r.h);}
  const row=btns.filter(x=>/^(Moves|Back|Forward|Hint|Flip|More|Review|Rematch)$/.test(x.t));
  if(row.length){M(geo,st,'row.n',row.length);M(geo,st,'row.minH',Math.min(...row.map(x=>x.h)));M(geo,st,'row.minW',Math.min(...row.map(x=>x.w)));M(geo,st,'row.top',row[0].y);M(geo,st,'row.labels',row.map(x=>x.t).join(' '));}
  const an=btns.find(x=>/Analyze$/.test(x.t)),cp=btns.find(x=>/Copy moves$/.test(x.t));
  if(an)M(geo,st,'tap.analyze',an.w+'x'+an.h);if(cp)M(geo,st,'tap.copy',cp.w+'x'+cp.h);
  const cts=await b.page.evaluate(()=>{const o={};for(const id of ['pbar-top','pbar-bottom','pbar-taken-w','pbar-taken-b','play-context','play-opening','play-moverow','eval-bar-v','moves-head']){const e=document.querySelector('[data-ct="'+id+'"]');if(!e)continue;const r=e.getBoundingClientRect();o[id]={x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,sw:e.scrollWidth,cw:e.clientWidth,t:(e.innerText||'').trim().slice(0,40)};}return o;});
  for(const id of ['pbar-top','pbar-bottom','pbar-taken-w','pbar-taken-b','play-context','play-moverow'])if(cts[id])M(geo,st,id+'.h',cts[id].h);
  if(cts['pbar-top'])M(geo,st,'pbar-top.y',cts['pbar-top'].y);
  if(cts['play-opening'])M(geo,st,'status.text',cts['play-opening'].t||'(blank)');
  if(cts['eval-bar-v'])M(geo,st,'evalbar',cts['eval-bar-v'].x+','+cts['eval-bar-v'].w);
  // player names: clipped?
  const names=await b.page.evaluate(()=>[...document.querySelectorAll('[data-ct="pbar-top"] span, [data-ct="pbar-bottom"] span')].filter(s=>s.style.textOverflow==='ellipsis').map(s=>({t:(s.innerText||'').trim().slice(0,24),sw:s.scrollWidth,cw:s.clientWidth})));
  if(names.length)M(geo,st,'names',names.map(n=>n.t+' '+n.sw+'/'+n.cw+(n.sw>n.cw?' CLIPPED':'')).join('; '));
  // the setup sheet
  if(/^setup/.test(st)){
    const sc=await P.scrollers(b);M(geo,st,'sheet.scrollers',sc.map(s=>s.pos+' sh'+s.sh+'/ch'+s.ch+' top'+s.scrollTop).join('; ')||'none');
    const fixed=sc.filter(s=>s.pos==='fixed');M(geo,st,'sheet.scroll',fixed.reduce((a,s)=>Math.max(a,s.sh-s.ch),0));M(geo,st,'behind.scroll',sc.filter(s=>s.pos!=='fixed').reduce((a,s)=>Math.max(a,s.sh-s.ch),0));
    const start=await P.textRect(b,/^(▶ Start game|Continue →|▶ Play this position)$/);if(start){M(geo,st,'start.top',start.y);M(geo,st,'start.bottom',start.bottom);M(geo,st,'start.h',start.h);M(geo,st,'start.belowFold',Math.max(0,Math.round((start.bottom-b.geo.h)*10)/10));}
    const bl=await P.textRect(b,/^Build #/);if(bl){M(geo,st,'build.bottom',bl.bottom);M(geo,st,'build.belowFold',Math.max(0,Math.round((bl.bottom-b.geo.h)*10)/10));}
    const bots=btns.filter(x=>/Elo$/.test(x.t));if(bots.length){M(geo,st,'bots.xRange',bots.map(x=>x.t.split(' ')[0]+'@'+x.x+'..'+(x.x+x.w)).join(' '));M(geo,st,'bots.fullyVisible',bots.filter(x=>x.x>=0&&x.x+x.w<=b.geo.w).length+'/'+bots.length);M(geo,st,'bots.h',bots.map(x=>x.h).join(','));}
    const tiles=await b.page.evaluate(()=>[...document.querySelectorAll('button')].map(bt=>{const s=[...bt.querySelectorAll('span,div')].find(x=>x.children.length===0&&(x.innerText||'').trim());if(!s)return null;const t=(s.innerText||'').trim();if(!/^(Online|Computer|Pass & Play|Friends|Play nearby|Tournaments|Scan with camera|Upload a photo|White|Black)$/.test(t))return null;return t+' '+s.scrollWidth+'/'+s.clientWidth+(s.scrollWidth>s.clientWidth+1?' CLIPPED':'');}).filter(Boolean));
    if(tiles.length)M(geo,st,'tiles',tiles.join('; '));
    const hb=await P.textRect(b,/^‹ Home$/);if(hb)M(geo,st,'tap.homeBtn',hb.w+'x'+hb.h);
    const chips=await b.page.evaluate(()=>[...document.querySelectorAll('span')].filter(s=>/^(No clock|\d+ min|\d\+\d|No limit|\d+ days? \/ move)$/.test((s.innerText||'').trim())).map(s=>{const r=s.getBoundingClientRect();return (s.innerText||'').trim()+' '+Math.round(r.width)+'x'+Math.round(r.height)+'@'+Math.round(r.top);}));
    if(chips.length){M(geo,st,'chips',chips.join('|'));M(geo,st,'chips.minH',Math.min(...chips.map(c=>+c.split(' ')[1].split('x')[1])));}
  }
  if(st==='online-continue'){M(geo,st,'nav.controls',btns.filter(x=>NAV.test(x.t)).length);M(geo,st,'tabbar',await b.tabBarVisible());}
  if(/more$/.test(st)){const sheet=await b.page.evaluate(()=>[...document.querySelectorAll('div[style*="z-index: 9990"] button')].map(x=>{const r=x.getBoundingClientRect();return (x.innerText||'').trim()+' '+Math.round(r.width)+'x'+Math.round(r.height);}));M(geo,st,'sheet.items',sheet.join('|')||'none');}
  if(/^(cpu-4ply|cpu-hint)$/.test(st)){const marked=await b.page.evaluate(()=>{const bd=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));if(!bd)return -1;const cols={};const list=[...bd.children].slice(0,64).map(k=>{const c=getComputedStyle(k).backgroundColor;cols[c]=(cols[c]||0)+1;return c;});const top2=Object.entries(cols).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);return list.filter(c=>!top2.includes(c)).length;});M(geo,st,'markedSquares',marked);}
  if(/^(cpu|pp|k10)/.test(st)){const gap=await b.page.evaluate(()=>{const pb=document.querySelector('[data-ct="pbar-bottom"]'),mr=document.querySelector('[data-ct="play-moverow"]');if(!pb||!mr)return null;return Math.round((mr.getBoundingClientRect().top-pb.getBoundingClientRect().bottom)*10)/10;});if(gap!=null)M(geo,st,'gap.barToRow',gap);M(geo,st,'movesShown',await P.movesShown(b));
    const list=await P.textRect(b,/^1\.\s*e4\s+\S+\s+2\.\s*Nf3/);if(list)M(geo,st,'list.rect',list.y+' '+list.w+'x'+list.h);}
  if(/mate|resigned|k10/.test(st)&&!/more|back|rematch/.test(st)){const ov=await P.textRect(b,/^(Checkmate!|Resigned|Stalemate)$/);M(geo,st,'overlay',ov?ov.text+'@'+ov.y+' '+ov.w+'x'+ov.h:'none');}
  if(st==='pp-captures'){const tk=await b.page.evaluate(()=>['pbar-taken-w','pbar-taken-b'].map(id=>{const e=document.querySelector('[data-ct="'+id+'"]');if(!e)return id+':none';const r=e.getBoundingClientRect();return id+' pieces'+e.querySelectorAll(':scope > span').length+' h'+Math.round(r.height)+' sw'+e.scrollWidth+'/cw'+e.clientWidth+' lead:'+((e.innerText||'').trim()||'-');}));M(geo,st,'taken',tk.join('; '));M(geo,st,'plies',await P.plies(b));}
  if(st==='cpu-viktor-1e4'){
    const samples=[];const t0=Date.now();let replied=false;
    while(Date.now()-t0<30000){const s=await P.status(b);const bd=await b.board();samples.push({t:Date.now()-t0,txt:s.txt,h:s.h,top:bd?Math.round(bd.y*10)/10:null});if((await P.plies(b))>=2){replied=true;break;}await b.page.waitForTimeout(40);}
    const texts=[...new Set(samples.map(s=>s.txt))],hs=[...new Set(samples.map(s=>s.h))],tops=[...new Set(samples.map(s=>s.top))];
    M(geo,st,'think.samples',samples.length);M(geo,st,'think.replyMs',replied?samples[samples.length-1].t:'no reply in 30s');M(geo,st,'think.texts',texts.join(' / '));M(geo,st,'think.statusHeights',hs.join(','));M(geo,st,'think.boardTops',tops.join(','));
    await b.settle(400);const s2=await P.status(b);M(geo,st,'think.after',s2.txt||'(blank)');
  }
  await b.shot(geo+'-'+st);
}

L.run(async()=>{
  for(const [geo,states] of PLAN){
    let b=await L.launch({geo,name:'audit-play-'+geo});await b.open();
    M(geo,'boot','stamp',await b.stamp());
    for(const st of states){
      const errsBefore=b.errs.length;
      try{await P.states[st](b);await b.settle(250);await measure(b,geo,st);}
      catch(e){M(geo,st,'DRIVE_ERROR',String(e).split('\n')[0].slice(0,200));try{await b.shot(geo+'-'+st+'-error');}catch(e2){}}
      if(/more$/.test(st))await P.closeSheet(b);
      if(b.errs.length>errsBefore)M(geo,st,'newErrs',b.errs.slice(errsBefore,errsBefore+3));
      // the Online sign-in screen has no way back: reload; if the reload does not mount, start a fresh browser
      if(st==='online-continue'){const t0=Date.now();let ok=true;try{await b.open();}catch(e){ok=false;}M(geo,st,'reload.mountMs',ok?(Date.now()-t0):'TIMEOUT '+(Date.now()-t0));if(!ok){await b.close();b=await L.launch({geo,name:'audit-play-'+geo+'-2'});await b.open();}}
    }
    await b.close();
  }
  // ---- invariants ----
  const g=(geo,st,k)=>(R[geo]&&R[geo][st]&&R[geo][st][k]);
  for(const geo of ['kunal','390']){
    const cpu=['cpu-m0','cpu-1e4','cpu-reply','cpu-4ply','cpu-moves-shown','cpu-back','cpu-forward','cpu-hint','cpu-flip','cpu-more','cpu-resigned','cpu-resigned-more','cpu-rematch','cpu-black','cpu-clock-m0','cpu-viktor-1e4'];
    const pp=['pp-m0','pp-1','pp-mate','pp-mate-more','pp-mate-back','pp-rematch','pp-captures','k10'];
    for(const [lab,list] of [['vs Computer',cpu],['Pass & Play',pp]]){
      const ws=[...new Set(list.map(s=>g(geo,s,'board.w')))],ts=[...new Set(list.map(s=>g(geo,s,'board.top')))];
      L.say(ws.length===1&&ws[0]!=null,geo+': '+lab+' board has ONE width across '+list.length+' states',ws);
      L.say(ts.length===1&&ts[0]!=null,geo+': '+lab+' board has ONE top across '+list.length+' states',ts);
    }
    const mo=g(geo,'cpu-moves-hidden','board.top'),mc=g(geo,'cpu-4ply','board.top');
    L.say(mo===mc,geo+': Moves toggle keeps the board top (A-12/X-09)',{listHidden:mo,listShown:mc,delta:mo!=null&&mc!=null?Math.round((mo-mc)*10)/10:null,gapHidden:g(geo,'cpu-moves-hidden','gap.barToRow'),gapShown:g(geo,'cpu-4ply','gap.barToRow')});
    L.say(g(geo,'cpu-4ply','movesShown')===true&&g(geo,'cpu-moves-hidden','movesShown')===false&&g(geo,'cpu-moves-shown','movesShown')===true,geo+': Moves button toggles the move list (shown by default, hidden after one tap, back after two)',{fresh:g(geo,'cpu-4ply','movesShown'),oneTap:g(geo,'cpu-moves-hidden','movesShown'),twoTaps:g(geo,'cpu-moves-shown','movesShown')});
    const overs=Object.entries(R[geo]).filter(([s])=>/^(cpu|pp|k10)/.test(s)).map(([s,v])=>[s,v['over.over']]).filter(x=>x[1]>0);
    L.say(overs.length===0,geo+': over<=0 on every board state',overs);
    const errs=Object.entries(R[geo]).filter(([s,v])=>v.errs>0).map(([s,v])=>s+':'+v.errs);
    L.say(errs.length===0,geo+': zero app console errors in every state',errs);
    const home=g(geo,'cpu-4ply','tap.home'),menu=g(geo,'cpu-4ply','tap.menu');
    L.say(home&&+home.split('x')[1]>=40,geo+': play-home tap target >= 40px tall',home);
    L.say(menu&&+menu.split('x')[1]>=40,geo+': play-menu tap target >= 40px tall',menu);
    L.say(+String(g(geo,'cpu-4ply','tap.analyze')).split('x')[1]>=40,geo+': Analyze tap target >= 40px tall (A-11)',g(geo,'cpu-4ply','tap.analyze'));
    L.say(g(geo,'setup','start.belowFold')===0,geo+': Start game is above the fold on the Computer sheet',{belowFold:g(geo,'setup','start.belowFold'),sheetScroll:g(geo,'setup','sheet.scroll')});
    L.say(g(geo,'setup-passplay','sheet.scroll')===0,geo+': Pass & Play sheet does not scroll (A-13)',{sheet:g(geo,'setup-passplay','sheet.scroll'),behind:g(geo,'setup-passplay','behind.scroll'),startBelowFold:g(geo,'setup-passplay','start.belowFold'),buildBelowFold:g(geo,'setup-passplay','build.belowFold')});
    L.say(g(geo,'online-continue','nav.controls')>0,geo+': the Online sign-in screen has a way back',{nav:g(geo,'online-continue','nav.controls'),tabbar:g(geo,'online-continue','tabbar')});
    L.say(!/Resign/.test(String(g(geo,'cpu-resigned-more','sheet.items'))),geo+': no Resign offered after the game (Y-06)',g(geo,'cpu-resigned-more','sheet.items'));
    L.say(g(geo,'cpu-resigned','board.w')===g(geo,'cpu-4ply','board.w')&&g(geo,'pp-mate','board.w')===g(geo,'pp-m0','board.w'),geo+': game over keeps the board size (X-01/A-02)',{resigned:g(geo,'cpu-resigned','board.w'),live:g(geo,'cpu-4ply','board.w'),mate:g(geo,'pp-mate','board.w'),ppLive:g(geo,'pp-m0','board.w')});
  }
  require('fs').writeFileSync(path.join(process.env.CT_SHOTS,'audit-play.json'),JSON.stringify(R,null,1));
  L.note('numbers written to '+path.join(process.env.CT_SHOTS,'audit-play.json'));
},'AUDIT-PLAY');
