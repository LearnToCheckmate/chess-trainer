'use strict';
// gates/drive/layout.js - the reading and the runner behind gates 177 and 178 (every screen clean at every phone width and text
// size). The gates' own headers say what is read and why; this file is the one copy of how. A gate calls run('notch') or run('flat').
const L=require('../lib');
const fs=require('fs'),path=require('path');
const D={home:require('./home'),menu:require('./menu'),lesson:require('./lesson'),puzzles:require('./puzzles'),play:require('./play'),review:require('./review')};
// the two states no driver has: the mistakes drill (three stored blunders, gate 123's fixture) with its first card open, and Analysis
// opened from that card once it is solved (the card's Analyze button) - the screen of his 19 Nov report (B13-SCREEN-REVIEW).
const DRILL_FENS=['4k3/8/8/8/8/8/1Q6/4K3 w - - 0 1','4k3/8/8/8/8/8/2Q5/4K3 w - - 0 1','4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1'],DRILL_UCIS=['b2b7','c2c7','d2d7'];
const openDrill=async(b)=>{await b.page.evaluate(([F,U])=>{localStorage.setItem('ct_mymistakes',JSON.stringify(F.map((f,i)=>({fen:f,uci:U[i],label:'Blunder',played:'Kd1',ts:1791000000000+i*1000,last:null,why:'the queen gets behind the pawn',hint:'look up the file',wc:{g:'Blunder',drop:25}}))));localStorage.setItem('ct_pool','3');},[DRILL_FENS,DRILL_UCIS]);
  await b.open();await b.tile('Review');await b.settle(700);await b.tapText(/find the move you missed/,{wait:1800});await b.page.locator('[data-ct="pz-top"]').waitFor({state:'visible',timeout:15000});await b.settle(900);};
D.own={states:{
  'drill':openDrill,
  'drill-analysis':async(b)=>{await openDrill(b);const bd=await b.board();if(!bd)throw new Error('drill-analysis: no board on the drill card');
        let done=false;for(const u of DRILL_UCIS){await b.move(u.slice(0,2),u.slice(2),900);if(await b.page.locator('[data-ct="drill-analyse"]').count()){done=true;break;}}
    if(!done)throw new Error('drill-analysis: the card was not solved by any of the three stored answers, so it offers no Analyze button');
    await b.tapCt('drill-analyse',1200);await b.settle(800);}
}};
// the phones of each launch. 'notch' carries his insets (ct_safe 51,31, read once at mount); 'flat' has none.
const LAUNCHES={notch:{geo:'kunal761',phones:[[375,761],[390,844],[414,896],[430,932]]},flat:{geo:'se',phones:[[320,568],[360,640],[375,667],[375,730]]}   /* 375x730: his R19 phone, 375x812 less the 51 and 31 insets, leaves a 375x730 column in the Home Screen app (the 730 is that arithmetic, not a phone), where Review and drill Analysis drew the board 344 wide, flush left, with the header row on (his 19 Nov report of about 43pt short) */};
const SIZES=[50,75,100,125];
// the sampled states: [name, driver, state, wantsBoard]
const STATES=[
  ['home','home','home',0],['home-bottom','home','home-bottom',0],['account-sheet','home','home-wave',0],['look','home','home-look',0],
  ['discover','home','discover',0],['openings-list','home','discover-openings',0],
  ['menu','menu','menu-discover',0],['menu-bottom','menu','menu-bottom',0],['feedback','menu','feedback-home',0],
  ['lesson-intro','lesson','intro',0],['lesson-demo','lesson','demo-m4',1],['lesson-demo-end','lesson','demo-end',1],['lesson-practice','lesson','practice-m0',1],['lesson-practice-wrong','lesson','practice-wrong',1],['tactics','lesson','tactics',1],
  ['puzzle-roadmap','puzzles','roadmap',0],['puzzle','puzzles','train',1],['puzzle-hint','puzzles','train-hint',1],['puzzle-solved','puzzles','train-solved',1],['puzzle-fail','puzzles','train-fail',1],
  ['play-setup','play','setup',0],['play-setup-bots','play','setup-bots',0],['play-cpu','play','cpu-4ply',1],['play-cpu-more','play','cpu-more',0],['play-cpu-resigned','play','cpu-resigned',1],['pass-and-play-mate','play','pp-mate',1],
  ['review-list-empty','review','list-empty',0],['review-list','review','list-stored',0],['review-summary','review','summary',0],['review-move-0','review','moves-ply0',1],['review-move-10','review','moves-ply10',1],
  ['review-last-move','review','moves-last',1],['review-more-sheet','review','more-sheet',0],['review-analysis','review','analysis',1],
  ['drill','own','drill',1],['drill-analysis','own','drill-analysis',1]
];
const KINDS=[['overlap','TC-R248a','no text or control overlaps another'],['cut','TC-R248b','no text is cut off without an ellipsis'],['spill','TC-R248c','no text or control spills out of its box or off the screen'],
  ['sideways','TC-R248d','nothing scrolls sideways'],['board','TC-R248e','the board fills the width'],['card','TC-R248f','every card is centred and fills the width']];
const PINFILE=path.join(__dirname,'..','fixtures','177-layout-pins.json');
const PIN_ABOUT='gates 177 and 178 (gates/drive/layout.js): the layout faults found on the tree this file was last written from; the fix list of jobs/every-screen-stays-clean-at-every-phone-width-and-text-size-2026-11-19. Key: screen state | kind | what. Value: the cells (phone WxH @ text size %) it happens in. A finding listed here is printed and counted, not red; any other finding is red. `capped` lists the cells where the height caps the board (state -> cell -> its width): there the board must be centred and at least that wide. Delete a key (or a cell) when its fault is fixed. Rewritten only by hand: CT_G177_WRITE_PINS=1 on each gate, on a trial bundle of the tree, with the diff read.';
const STRICT=process.env.CT_G177_STRICT==='1';
const reS=process.env.CT_G177_STATES?new RegExp(process.env.CT_G177_STATES):null,reC=process.env.CT_G177_CELLS?new RegExp(process.env.CT_G177_CELLS):null;

// ── the reading, run in the page ─────────────────────────────────────────────────────────────────────────────────────────────────
function MEASURE(){
  const vw=window.innerWidth,vh=window.innerHeight,out=[],stats={texts:0,controls:0,ellipsis:0,cards:0};
  const csC=new Map();const cs=(e)=>{let c=csC.get(e);if(!c){c=getComputedStyle(e);csC.set(e,c);}return c;};
  const alpha=(s)=>{const m=String(s||'').match(/rgba?\(([^)]+)\)/);if(!m)return 0;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return p.length>3?p[3]:1;};
  const backed=(e)=>{const c=cs(e);return alpha(c.backgroundColor)>=0.5||(c.backgroundImage&&c.backgroundImage!=='none'&&!/^url/.test(c.backgroundImage));};
  const bordered=(e)=>{const c=cs(e);return ['Top','Right','Bottom','Left'].some(s=>parseFloat(c['border'+s+'Width'])>0&&c['border'+s+'Style']!=='none'&&alpha(c['border'+s+'Color'])>=0.12);};
  const boxed=(e)=>alpha(cs(e).backgroundColor)>=0.04||(cs(e).backgroundImage&&cs(e).backgroundImage!=='none')||bordered(e);
  const ROOTS=new Set([document.documentElement,document.body,document.getElementById('root')]);
  const hiddenEl=(e)=>{for(let p=e;p&&p.nodeType===1;p=p.parentElement){const c=cs(p);if(c.display==='none'||c.visibility==='hidden'||parseFloat(c.opacity)<0.05)return true;
    if(/inset\(50%\)/.test(c.clipPath||'')||(c.overflow==='hidden'&&p.offsetWidth<=1&&p.offsetHeight<=1))return true;}return false;};   // the second line: text kept for screen readers only
  const inBoard=(e)=>!!e.closest('div[style*="repeat(8"]');
  const layerOf=(e)=>{for(let p=e;p&&p.nodeType===1;p=p.parentElement){if(cs(p).position==='fixed')return p;}return document.body;};
  // the rect left after every clipping ancestor; which ancestor cut it, and whether that ancestor says so (ellipsis / clamp) or scrolls
  const clip=(e,r,own)=>{let l=r.left,t=r.top,rt=r.right,b=r.bottom,cutX=null,cutY=null,skipTo=null;
    for(let p=e;p&&p.nodeType===1&&!ROOTS.has(p);p=p.parentElement){
      if(skipTo){if(p!==skipTo)continue;skipTo=null;}
      const c=cs(p);
      if(p!==e||own){const ox=c.overflowX,oy=c.overflowY;
        if(ox!=='visible'||oy!=='visible'){const q=p.getBoundingClientRect();const il=q.left+p.clientLeft,it=q.top+p.clientTop,ir=il+p.clientWidth,ib=it+p.clientHeight;
          if(ox!=='visible'){if(il>l+0.01||ir<rt-0.01)cutX={el:p,mode:ox};l=Math.max(l,il);rt=Math.min(rt,ir);}
          if(oy!=='visible'){if(it>t+0.01||ib<b-0.01)cutY={el:p,mode:oy};t=Math.max(t,it);b=Math.min(b,ib);}}}
      if(c.position==='fixed')break;
      if(c.position==='absolute'){let op=p.parentElement;while(op&&!ROOTS.has(op)&&cs(op).position==='static')op=op.parentElement;if(!op||ROOTS.has(op))break;skipTo=op;}
    }
    return {l,t,r:rt,b,w:Math.max(0,rt-l),h:Math.max(0,b-t),cutX,cutY};};
  const says=(from,to)=>{for(let p=from;p&&p.nodeType===1;p=p.parentElement){const c=cs(p);if(c.textOverflow==='ellipsis'||(c.webkitLineClamp&&c.webkitLineClamp!=='none'))return true;if(p===to)break;}return false;};
  const desc=(e,txt)=>{let ct='';for(let p=e,i=0;p&&p.nodeType===1&&i<7;p=p.parentElement,i++){const a=p.getAttribute&&p.getAttribute('data-ct');if(a){ct=a;break;}}
    const t=String(txt!=null?txt:(e.innerText||e.getAttribute('aria-label')||e.getAttribute('title')||'')).replace(/\s+/g,' ').trim().replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g,"Mon").replace(/\d+/g,"#").slice(0,22);
    return (ct?'['+ct+'] ':'')+e.tagName.toLowerCase()+(t?' "'+t+'"':'');};
  const inFront=(e,c)=>{ // not covered by ANOTHER fixed layer at its sample points
    const pts=[[c.l+c.w/2,c.t+c.h/2],[c.l+Math.min(3,c.w/2),c.t+c.h/2],[c.r-Math.min(3,c.w/2),c.t+c.h/2]];const my=layerOf(e);let seen=0;
    for(const [x,y] of pts){if(x<0||y<0||x>=vw||y>=vh)continue;const h=document.elementFromPoint(x,y);if(!h)continue;
      if(h===e||e.contains(h)||h.contains(e)){seen++;continue;}const hl=layerOf(h);if(hl===my||hl.contains(e)){seen++;continue;}
      // another fixed layer is on top here: is this element drawn above it anyway? (a higher layer is hit first, so no)
    }
    return seen>0;};
  const add=(kind,d,detail)=>out.push({kind,desc:d,detail});
  const r1=(v)=>Math.round(v*10)/10;
  // ── atoms ──
  const texts=[],controls=[];
  {const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let tn;const byNode=[];
    while((tn=w.nextNode())){const s=tn.nodeValue;if(!s||!s.trim())continue;const p=tn.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(p.tagName))continue;if(hiddenEl(p))continue;
      const rg=document.createRange();rg.selectNodeContents(tn);const lines=[];
      for(const q of rg.getClientRects()){if(q.width<0.5||q.height<0.5)continue;const last=lines[lines.length-1];
        if(last&&Math.abs(last.top-q.top)<2&&q.left<=last.right+1.5){last.right=Math.max(last.right,q.right);last.bottom=Math.max(last.bottom,q.bottom);last.left=Math.min(last.left,q.left);}
        else lines.push({left:q.left,top:q.top,right:q.right,bottom:q.bottom});}
      if(!lines.length)continue;byNode.push({p,s:s.trim(),lines});}
    for(const N of byNode){let part=0,gone=0,full=0,worst=null;const vis=[];
      for(const q of N.lines){const c=clip(N.p,q,true);const w0=q.right-q.left,h0=q.bottom-q.top;
        if(c.w<=0.5||c.h<=0.5){ // wholly clipped: by something that scrolls it is simply out of view
          const by=(c.w<=0.5?c.cutX:null)||(c.h<=0.5?c.cutY:null)||c.cutX||c.cutY;if(by&&(by.mode==='hidden'||by.mode==='clip')){gone++;if(!worst)worst={by,q};}continue;}
        if(c.r<=0||c.b<=0||c.l>=vw||c.t>=vh)continue;
        const lostX=w0-c.w,lostY=h0-c.h;const hx=c.cutX&&(c.cutX.mode==='hidden'||c.cutX.mode==='clip')&&lostX>2,hy=c.cutY&&(c.cutY.mode==='hidden'||c.cutY.mode==='clip')&&lostY>Math.max(3,0.25*h0);
        if(hx||hy){part++;worst={by:hx?c.cutX:c.cutY,q,lostX,lostY};}else full++;
        vis.push({q,c});}
      if(!vis.length)continue;
      const front=vis.filter(v=>inFront(N.p,v.c));if(!front.length)continue;
      stats.texts++;
      if((part>0||(gone>0&&full+part>0))&&worst){if(says(N.p,worst.by.el))stats.ellipsis++;
        else add('cut',desc(N.p,N.s),{text:N.s.slice(0,40),linesWhole:full,linesPart:part,linesGone:gone,lostX:r1(worst.lostX||0),lostY:r1(worst.lostY||0),by:desc(worst.by.el,'')});}
      for(const v of front)texts.push({el:N.p,s:N.s,l:v.c.l,t:v.c.t,r:v.c.r,b:v.c.b,ql:v.q.left,qr:v.q.right,qt:v.q.top,qb:v.q.bottom,cutX:v.c.cutX});}}
  for(const e of document.querySelectorAll('button,input,select,textarea,a[href],[role="button"]')){if(e.closest('svg'))continue;if(hiddenEl(e))continue;const q=e.getBoundingClientRect();if(q.width<2||q.height<2)continue;const c=clip(e,q,false);
    if(c.w<=1||c.h<=1||c.r<=0||c.b<=0||c.l>=vw||c.t>=vh)continue;if(!inFront(e,c))continue;stats.controls++;controls.push({el:e,l:c.l,t:c.t,r:c.r,b:c.b,ql:q.left,qr:q.right,qt:q.top,qb:q.bottom,cutX:c.cutX});}
  // ── a OVERLAP ──
  const lca=(a,b)=>{for(let p=a;p;p=p.parentElement)if(p.contains(b))return p;return document.body;};
  const backing=(e,stop)=>{for(let p=e;p&&p!==stop;p=p.parentElement)if(backed(p))return true;return false;};
  const ix=(A,B)=>({x:Math.min(A.r,B.r)-Math.max(A.l,B.l),y:Math.min(A.b,B.b)-Math.max(A.t,B.t)});
  const related=(a,b)=>a===b||a.contains(b)||b.contains(a);
  const seenPair=new Set();
  const canScroll=(e)=>{for(let p=e;p&&p.nodeType===1;p=p.parentElement){const c=cs(p);if(/auto|scroll/.test(c.overflowY)&&p.scrollHeight>p.clientHeight+1)return true;}return false;};
  for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const A=texts[i],B=texts[j];if(A.el===B.el)continue;const o=ix(A,B);if(o.x<=2)continue;
    const mh=Math.min(A.b-A.t,B.b-B.t);if(o.y<=3||o.y<=0.34*mh)continue;if(layerOf(A.el)!==layerOf(B.el))continue;
    const c=lca(A.el,B.el);if(backing(A.el,c)||backing(B.el,c))continue;
    const k=desc(A.el,A.s)+' x '+desc(B.el,B.s);if(seenPair.has(k))continue;seenPair.add(k);add('overlap',k,{kind:'text on text',overlap:[r1(o.x),r1(o.y)],a:A.s.slice(0,30),b:B.s.slice(0,30)});}
  for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const A=controls[i],B=controls[j];if(related(A.el,B.el))continue;const o=ix(A,B);if(o.x<=2||o.y<=2)continue;if(layerOf(A.el)!==layerOf(B.el))continue;
    const k=desc(A.el)+' x '+desc(B.el);if(seenPair.has(k))continue;seenPair.add(k);add('overlap',k,{kind:'control on control',overlap:[r1(o.x),r1(o.y)]});}
  // a control that paints nothing of its own (no fill, no border) is only as big as what it draws: its tap box may be padded out to 44px
  // over a neighbour (the icon chips in the moves panel are, on purpose), and that is not ink on ink. Such a control is read by its ink.
  const inkOf=(e)=>{if(boxed(e))return null;let l=1e9,t=1e9,r=-1e9,b=-1e9;const add=(q)=>{if(q.width<0.5||q.height<0.5)return;l=Math.min(l,q.left);t=Math.min(t,q.top);r=Math.max(r,q.right);b=Math.max(b,q.bottom);};
    for(const k of e.querySelectorAll('*')){if(k.tagName==='svg'||k.tagName==='IMG'||boxed(k))add(k.getBoundingClientRect());}
    const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let tn;while((tn=w.nextNode())){if(!tn.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(tn);for(const q of rg.getClientRects())add(q);}
    return r>l?{l,t,r,b}:null;};
  for(const T of texts)for(const C of controls){if(related(T.el,C.el))continue;let o=ix(T,C);if(o.x<=2||o.y<=3||o.y<=0.34*(T.b-T.t))continue;
    if(C.ink===undefined)C.ink=inkOf(C.el);if(C.ink){o=ix(T,C.ink);if(o.x<=2||o.y<=3||o.y<=0.34*(T.b-T.t))continue;}

    if(layerOf(T.el)!==layerOf(C.el)){   // a pinned bar over the page: a fault only where the line is half under it and nothing can scroll it clear
      if(o.y>=0.9*(T.b-T.t)||canScroll(T.el))continue;const k2=desc(T.el,T.s)+' x '+desc(C.el);if(seenPair.has(k2))continue;seenPair.add(k2);add('overlap',k2,{kind:'text half under a pinned control, and nothing scrolls',overlap:[r1(o.x),r1(o.y)],text:T.s.slice(0,30)});continue;}
    const h=document.elementFromPoint(Math.max(T.l,C.l)+o.x/2,Math.max(T.t,C.t)+o.y/2);const textOnTop=!!h&&related(h,T.el)&&!related(h,C.el);
    if(textOnTop&&backing(T.el,lca(T.el,C.el)))continue;   // a badge with its own face, drawn over a control
    const k=desc(T.el,T.s)+' x '+desc(C.el);if(seenPair.has(k))continue;seenPair.add(k);add('overlap',k,{kind:textOnTop?'text on a control':'text under a control',overlap:[r1(o.x),r1(o.y)],text:T.s.slice(0,30)});}
  // crowding: a text run or a pill hard against a pill that is not its own (less than 2px between them on one line)
  {const pills=[];for(const e of document.querySelectorAll('div,span,button,b,i,em,strong,label,a')){const q=e.getBoundingClientRect();if(q.width<6||q.height<8||q.width>0.6*vw||q.height>64||q.bottom<=0||q.top>=vh)continue;
      const c=cs(e);if(!(bordered(e)||alpha(c.backgroundColor)>=0.15))continue;if(!(e.innerText||'').trim()||e.closest('svg')||inBoard(e)||hiddenEl(e))continue;const cl=clip(e,q,false);if(cl.w<q.width-1||cl.h<q.height-1)continue;if(!inFront(e,cl))continue;
      pills.push({el:e,l:q.left,t:q.top,r:q.right,b:q.bottom,ctl:/^(BUTTON|A)$/.test(e.tagName)||e.getAttribute('role')==='button'});}
    const near=(A,B)=>{const oy=Math.min(A.b,B.b)-Math.max(A.t,B.t);if(oy<0.5*Math.min(A.b-A.t,B.b-B.t))return null;const g=Math.max(A.l-B.r,B.l-A.r);return g<2?g:null;};
    for(const P of pills){for(const T of texts){if(related(T.el,P.el)||layerOf(T.el)!==layerOf(P.el))continue;const g=near(T,P);if(g==null)continue;
        if(T.el.parentElement!==P.el.parentElement&&!(T.el.parentElement&&T.el.parentElement.parentElement===P.el.parentElement)&&T.el!==P.el.parentElement)continue;   // neighbours in one row only
        const k=desc(T.el,T.s)+' x '+desc(P.el);if(seenPair.has(k))continue;seenPair.add(k);add('overlap',k,{kind:'text hard against a box',gap:r1(g),text:T.s.slice(0,30)});}
      for(const Q of pills){if(Q===P||related(P.el,Q.el)||P.el.parentElement!==Q.el.parentElement||(P.ctl&&Q.ctl))continue;if(P.l>Q.l)continue;const g=near(P,Q);if(g==null)continue;
        const k=desc(P.el)+' x '+desc(Q.el);if(seenPair.has(k))continue;seenPair.add(k);add('overlap',k,{kind:'two boxes hard against each other',gap:r1(g)});}}}
  // a placeholder or a chosen option wider than its field (not a text node, so read by its measured width)
  {const cv=document.createElement('canvas').getContext('2d');
    for(const C of controls){const e=C.el,tag=e.tagName;let txt=null;if((tag==='INPUT'||tag==='TEXTAREA')&&!e.value&&e.placeholder)txt=e.placeholder;else if(tag==='SELECT'&&e.selectedOptions&&e.selectedOptions[0])txt=e.selectedOptions[0].text;
      if(!txt||(tag==='TEXTAREA'&&e.clientHeight>60))continue;const c=cs(e);cv.font=c.fontStyle+' '+c.fontWeight+' '+c.fontSize+' '+c.fontFamily;const need=cv.measureText(txt).width;
      const room=e.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight)-(tag==='SELECT'?16:0);
      if(need>room+2)add('cut',desc(e,txt),{text:txt.slice(0,40),needs:r1(need),room:r1(room),what:tag==='SELECT'?'the chosen option':'the placeholder'});}}
  // ── c SPILL ──
  const boxOf=(e,self)=>{for(let p=self?e:e.parentElement;p&&p.nodeType===1&&!ROOTS.has(p);p=p.parentElement){if(boxed(p)||/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(p.tagName))return p;}return null;};
  const spill=(A,isText)=>{const bx=boxOf(A.el,isText);const d=isText?desc(A.el,A.s):desc(A.el);
    if(A.l<vw-2&&A.r>vw+1.5&&!A.cutX){add('spill',d,{off:'the right edge of the screen',by:r1(A.r-vw)});return;}
    if(A.r>2&&A.l<-1.5&&!A.cutX){add('spill',d,{off:'the left edge of the screen',by:r1(-A.l)});return;}
    if(!bx)return;const q=bx.getBoundingClientRect();if(A.r<=q.left||A.l>=q.right||A.b<=q.top||A.t>=q.bottom)return;   // wholly outside is a label placed beside its box, not a spill
    const tolY=isText?3:1.5;const over={right:A.r-q.right,left:q.left-A.l,bottom:A.b-q.bottom,top:q.top-A.t};
    const bad=[];if(over.right>1.5)bad.push('right '+r1(over.right));if(over.left>1.5)bad.push('left '+r1(over.left));if(over.bottom>tolY)bad.push('bottom '+r1(over.bottom));if(over.top>tolY)bad.push('top '+r1(over.top));
    if(bad.length){add('spill',d,{past:bad.join(', '),box:desc(bx,'')});return;}
    if(isText&&A.s.replace(/[^A-Za-z]/g,'').length>=3&&bordered(bx)&&bx.getBoundingClientRect().width<0.6*vw){const c=cs(bx);const il=q.left+parseFloat(c.borderLeftWidth),ir=q.right-parseFloat(c.borderRightWidth);
      if(A.ql-il<-0.5||ir-A.qr<-0.5)add('spill',d,{tight:'the text runs into the border of its own box',left:r1(A.ql-il),right:r1(ir-A.qr),box:desc(bx,'')});}};
  for(const T of texts)spill(T,true);
  for(const C of controls)spill(C,false);
  // ── d SIDEWAYS ──
  const de=document.documentElement,root=document.getElementById('root');
  if(de.scrollWidth>vw+1)add('sideways','the page',{scrollWidth:de.scrollWidth,vw});
  if(document.body.scrollWidth>vw+1&&de.scrollWidth<=vw+1)add('sideways','the body',{scrollWidth:document.body.scrollWidth,vw});
  if(root&&root.scrollWidth>root.clientWidth+1)add('sideways','#root',{scrollWidth:root.scrollWidth,clientWidth:root.clientWidth});
  for(const e of document.querySelectorAll('div,section,main,ul')){if(ROOTS.has(e))continue;const c=cs(e);if(!/auto|scroll/.test(c.overflowX))continue;if(e.scrollWidth<=e.clientWidth+1)continue;if(hiddenEl(e))continue;
    const q=e.getBoundingClientRect();if(q.width<2||q.height<2||q.bottom<=0||q.top>=vh)continue;const vert=/auto|scroll/.test(c.overflowY)&&e.scrollHeight>e.clientHeight+1;
    if(!(vert||e.clientHeight>=0.4*vh))continue;const cl=clip(e,q,false);if(cl.w<=1||cl.h<=1||!inFront(e,cl))continue;
    add('sideways',desc(e,''),{scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,height:e.clientHeight,alsoScrollsDown:vert});}
  // ── e BOARD ──
  let board=null;{let best=null;for(const d of document.querySelectorAll('div')){if(!/repeat\(8,/.test(d.style.gridTemplateColumns||''))continue;if(/^(look-board|scan-check-board)$/.test(d.getAttribute('data-ct')||''))continue;const q=d.getBoundingClientRect();if(q.width<40||hiddenEl(d))continue;if(!best||q.width>best.q.width)best={d,q};}
    if(best){const c=clip(best.d,best.q,false);if(c.w>1&&c.h>1&&inFront(best.d,c)){board={x:r1(best.q.left),w:r1(best.q.width),y:r1(best.q.top),gapL:r1(best.q.left),gapR:r1(vw-best.q.right)};
      if(board.gapL>1.5||board.gapR>1.5)add('board','the board',{width:board.w,of:vw,left:board.gapL,right:board.gapR});}}}
  // ── f CARD ──
  {const cands=[];for(const e of document.querySelectorAll('div,button,section,a,li')){if(ROOTS.has(e))continue;const q=e.getBoundingClientRect();if(q.width<0.5*vw||q.height<36||q.bottom<=0||q.top>=vh)continue;
      if(hiddenEl(e))continue;const c=cs(e);if(!(alpha(c.backgroundColor)>=0.04||(c.backgroundImage&&c.backgroundImage!=='none')||bordered(e)))continue;if(!(parseFloat(c.borderTopLeftRadius)>=4))continue;
      if(/repeat\(8,/.test(e.style.gridTemplateColumns||'')||e.querySelector('div[style*="repeat(8"]'))continue;   // the board and what frames it are read by e
      const cl=clip(e,q,false);if(cl.w<=1||cl.h<=1||cl.w<q.width-1)continue;if(!inFront(e,cl))continue;cands.push({e,q});}
    const outer=cands.filter(K=>!cands.some(O=>O!==K&&O.e.contains(K.e)));const lim=Math.max(32,0.1*vw);
    for(const K of outer){stats.cards++;const gl=K.q.left,gr=vw-K.q.right;const d=desc(K.e);
      if(board&&K.q.left<board.x+board.w&&K.q.right>board.x&&K.q.top<board.y+board.w&&K.q.bottom>board.y)continue;   // a panel over the board is a popup, not a card of the page
      const side=(l,r)=>[...texts,...controls].some(a=>!K.e.contains(a.el)&&a.r>l+1&&a.l<r-1&&a.b>K.q.top+2&&a.t<K.q.bottom-2);
      if(Math.abs(gl-gr)>3){if(!side(gl>gr?0:K.q.right,gl>gr?K.q.left:vw))add('card',d,{fault:'off centre',left:r1(gl),right:r1(gr),width:r1(K.q.width),of:vw});}
      else if(gl>lim&&gr>lim&&!side(0,K.q.left)&&!side(K.q.right,vw))add('card',d,{fault:'narrow: empty screen on both sides',left:r1(gl),right:r1(gr),width:r1(K.q.width),of:vw});}}
  // a list that hides rows behind its own scroll while the screen under it is empty
  for(const e of document.querySelectorAll('div,ul')){if(ROOTS.has(e))continue;const c=cs(e);if(!/auto|scroll/.test(c.overflowY)||e.scrollHeight<=e.clientHeight+8||hiddenEl(e))continue;const q=e.getBoundingClientRect();
    if(q.width<0.5*vw||q.height<40||q.bottom>=vh||q.top<0)continue;const cl=clip(e,q,false);if(cl.h<q.height-1||!inFront(e,cl))continue;
    let next=vh;for(const a of [...texts,...controls]){if(e.contains(a.el))continue;if(a.t>=q.bottom-1&&a.t<next)next=a.t;}
    const empty=next-q.bottom;if(empty>=0.15*vh)add('card',desc(e,''),{fault:'a list cut short while the screen under it is empty',hidden:e.scrollHeight-e.clientHeight,emptyBelow:r1(empty),of:vh});}
  // one finding per (kind, desc) in a cell
  const seen=new Set(),uniq=[];for(const f of out){const k=f.kind+'|'+f.desc;if(seen.has(k))continue;seen.add(k);uniq.push(f);}
  return {vw,vh,findings:uniq,stats,board};
}
async function settleCell(b){let prev='';for(let i=0;i<12;i++){await b.page.waitForTimeout(i===0?170:90);
  const sig=await b.page.evaluate(()=>{const g=[...document.querySelectorAll('div')].filter(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||'')).map(d=>{const r=d.getBoundingClientRect();return Math.round(r.left)+','+Math.round(r.width);}).join(';');
    const r=document.getElementById('root');return g+'|'+(r?r.scrollHeight:0)+'|'+document.querySelectorAll('*').length;});
  if(sig===prev)return;prev=sig;}}

async function run(which){
  const LN=Object.assign({name:which},LAUNCHES[which]);if(!LN.geo)throw new Error('layout.run: launch must be notch or flat, not '+which);
  let pins={},capped={},notes={};try{const pf=JSON.parse(fs.readFileSync(PINFILE,'utf8'));pins=pf.pins||{};capped=pf.capped||{};notes=pf.notes||{};}catch(e){pins={};capped={};notes={};}   // notes: key -> why it is still pinned (kept as written; a note whose key is gone is dropped)
  // THE HEIGHT CAP (part 2 of the job; FB-07). The board fills the width unless the height caps it: where the rows round it are at their
  // floors and the screen is still too short, the board is as wide as the height leaves and sits CENTRED. Those cells are listed in the
  // fixture's `capped` (state -> cell -> the board's width there). In a listed cell the board passes if it is centred within 1.5px and
  // at least that wide (less 1px); narrower or off centre is a finding. In every other cell any side gap over 1.5px is a finding.
  // The list is written by hand only (CT_G177_WRITE_CAPPED=1, centred boards only, the diff read): a cell belongs on it only when the
  // rows have nothing left to give, which is a judgement the gate cannot make for itself.
  const WRITE_CAPPED=process.env.CT_G177_WRITE_CAPPED==='1';let nCapped=0;
  if(WRITE_CAPPED){const mine=[];for(const [w,h] of LN.phones)for(const t of SIZES)mine.push(w+'x'+h+'@'+t);for(const st of Object.keys(capped)){for(const c of mine)delete capped[st][c];if(!Object.keys(capped[st]).length)delete capped[st];}}
  let tDrive=0,tCells=0;const all=[];             // every finding: {state,cell,kind,desc,detail}
  const perState={};let myCells=[];
  const wanted=STATES.filter(s=>!reS||reS.test(s[0]));
  {
    const cells=[];for(const [w,h] of LN.phones)for(const t of SIZES){const id=w+'x'+h+'@'+t;if(reC&&!reC.test(id))continue;cells.push({id,w:Math.round(w*100/t),h:Math.round(h*100/t)});}
    if(!cells.length)throw new Error('CT_G177_CELLS matches no cell of the '+which+' launch');
    myCells=cells.map(c=>c.id);
    const base=L.GEOS[LN.geo];
    const b=await L.launch({geo:LN.geo,name:'g177-'+LN.name});await b.open();
    let lastDrv=null;
    for(const [name,drv,st,wantsBoard] of wanted){
      const ps=perState[name]=perState[name]||{reached:0,failed:[],cells:0,minTexts:1e9,boards:0,wantsBoard};
      await b.page.setViewportSize({width:base.w,height:base.h});await b.page.waitForTimeout(150);
      const t0=Date.now();
      try{if(lastDrv&&lastDrv!==drv){await b.open();}lastDrv=drv;await D[drv].states[st](b);await b.settle(500);}catch(e){ps.failed.push(LN.name+': '+String(e&&e.message||e).split('\n')[0].slice(0,160));continue;}
      ps.reached++;tDrive+=Date.now()-t0;const t1=Date.now();
      for(const c of cells){
        await b.page.setViewportSize({width:c.w,height:c.h});await settleCell(b);
        let m;try{m=await b.page.evaluate(MEASURE);}catch(e){ps.failed.push(LN.name+' '+c.id+': the reading threw '+String(e&&e.message||e).split('\n')[0].slice(0,160));continue;}
        // a finding that is not pinned is read a second time 700 ms later and kept only if it is still there (a title mid-fade is not a fault)
        const unpinned=(mm)=>mm.findings.filter(f=>STRICT||!(pins[name+'|'+f.kind+'|'+f.desc]||[]).includes(c.id));
        if(m&&unpinned(m).length){await b.page.waitForTimeout(700);try{const m2=await b.page.evaluate(MEASURE);const k2=new Set(m2.findings.map(f=>f.kind+'|'+f.desc));m.findings=m.findings.filter(f=>k2.has(f.kind+'|'+f.desc));}catch(e){}}
        ps.cells++;ps.minTexts=Math.min(ps.minTexts,m.stats.texts);if(m.board)ps.boards++;
        ps.ellipsis=(ps.ellipsis||0)+m.stats.ellipsis;ps.cards=(ps.cards||0)+m.stats.cards;
        for(const f of m.findings){
          if(f.kind==='board'){const d=f.detail,centred=Math.abs(d.left-d.right)<=1.5;const want=(capped[name]||{})[c.id];
            if(WRITE_CAPPED&&centred&&(!process.env.CT_G177_CAPPED_STATES||new RegExp(process.env.CT_G177_CAPPED_STATES).test(name))){(capped[name]=capped[name]||{})[c.id]=d.width;nCapped++;continue;}
            if(want!=null&&centred&&d.width>=want-1){nCapped++;continue;}
            if(want!=null)f.detail=Object.assign({heightCappedCell:'listed at '+want+' wide, centred',fault:centred?'narrower than listed':'off centre'},d);}
          all.push({state:name,cell:c.id,vp:c.w+'x'+c.h,kind:f.kind,desc:f.desc,detail:f.detail});}
        if(process.env.CT_G177_SHOTS==='1')await b.shot('g177-'+name+'-'+c.id.replace('@','at')+'-'+c.w+'x'+c.h);
      }
      tCells+=Date.now()-t1;
    }
    const bad=b.errs.filter(e=>!/RuntimeError: unreachable/.test(e));
    L.say(bad.length===0,'TC-R248 '+which+' launch: no app error while every state was driven and resized through its cells',{errs:bad.slice(0,3)});
    await b.close();
  }
  // ── the verdicts ──
  const group={};for(const f of all){const k=f.state+'|'+f.kind+'|'+f.desc;(group[k]=group[k]||{cells:[],sample:f}).cells.push(f.cell);}
  if(process.env.CT_G177_OUT)fs.writeFileSync(process.env.CT_G177_OUT,JSON.stringify({all,group:Object.fromEntries(Object.entries(group).map(([k,v])=>[k,{cells:v.cells,sample:v.sample.detail,vp:v.sample.vp}]))},null,1));
  if(process.env.CT_G177_WRITE_PINS==='1'){   // this launch's cells are rewritten from this run; the other launch's cells are kept as they are
    const allIds=[];for(const [w,h] of LN.phones)for(const t of SIZES)allIds.push(w+'x'+h+'@'+t);
    if(reS||reC)throw new Error('CT_G177_WRITE_PINS needs the whole launch: unset CT_G177_STATES and CT_G177_CELLS');
    const o={};for(const k of Object.keys(pins)){const keep=pins[k].filter(c=>!allIds.includes(c));if(keep.length)o[k]=keep;}
    for(const k of Object.keys(group))o[k]=(o[k]||[]).concat(group[k].cells);
    const sorted={};for(const k of Object.keys(o).sort())sorted[k]=o[k];
    fs.writeFileSync(PINFILE,JSON.stringify({about:PIN_ABOUT,notes:Object.fromEntries(Object.entries(notes).filter(([k])=>sorted[k])),pins:sorted,capped},null,1)+'\n');L.note('pins rewritten for the '+which+' launch: '+Object.keys(sorted).length+' keys in the file');pins=sorted;}
  else if(WRITE_CAPPED){if(reS||reC)throw new Error('CT_G177_WRITE_CAPPED needs the whole launch');
    // a cell now on the capped list leaves the board pins; nothing else in the pins moves
    const o={};for(const k of Object.keys(pins)){const [st,kind]=k.split('|');const keep=kind==='board'?pins[k].filter(c=>!(capped[st]&&capped[st][c]!=null)):pins[k];if(keep.length)o[k]=keep;}
    const cs={};for(const st of Object.keys(capped).sort()){cs[st]={};for(const c of Object.keys(capped[st]).sort())cs[st][c]=capped[st][c];}
    fs.writeFileSync(PINFILE,JSON.stringify({about:PIN_ABOUT,notes:Object.fromEntries(Object.entries(notes).filter(([k])=>o[k])),pins:o,capped:cs},null,1)+'\n');L.note('capped list rewritten for the '+which+' launch');pins=o;capped=cs;}
  let nPinned=0,nNew=0;const usedPins=new Set();
  for(const [name,,,wantsBoard] of wanted){const ps=perState[name]||{reached:0,failed:['never driven'],cells:0,minTexts:0,boards:0};
    L.say(ps.failed.length===0&&ps.reached===1&&ps.cells===myCells.length&&ps.cells>0&&ps.minTexts>0&&(!wantsBoard||ps.boards===ps.cells),'TC-R248 '+which+' '+name+': DENOMINATOR - the state was reached, all '+myCells.length+' cells were read, each read found text in front'+(wantsBoard?', and a board in every cell':''),
      {reached:ps.reached,cells:ps.cells,fewestTextRuns:ps.minTexts===1e9?0:ps.minTexts,boards:ps.boards,failed:ps.failed.slice(0,3)});
    for(const [kind,id,words] of KINDS){
      const mine=Object.keys(group).filter(k=>k.startsWith(name+'|'+kind+'|'));const fresh=[];let pinnedHere=0;
      for(const k of mine){const pc=STRICT?[]:(pins[k]||[]);const newCells=group[k].cells.filter(c=>!pc.includes(c));if(pins[k])usedPins.add(k);
        pinnedHere+=group[k].cells.length-newCells.length;if(newCells.length)fresh.push({what:k.split('|').slice(2).join('|'),cells:newCells,sample:group[k].sample.detail});}
      nPinned+=pinnedHere;nNew+=fresh.reduce((a,f)=>a+f.cells.length,0);
      L.say(fresh.length===0,id+' '+which+' '+name+': '+words+' in every cell'+(pinnedHere?' EXCEPT '+pinnedHere+' pinned finding(s) on the fix list':''),fresh.length?{new:fresh.slice(0,6),more:Math.max(0,fresh.length-6)}:{cells:ps.cells,pinned:pinnedHere});
    }
  }
  const stale=[];for(const k of Object.keys(pins)){if(!wanted.some(s=>s[0]===k.split('|')[0]))continue;const gone=pins[k].filter(c=>myCells.includes(c)&&!(group[k]&&group[k].cells.includes(c)));if(gone.length)stale.push(k+' @ '+gone.join(','));}
  L.note('TC-R248 totals: '+all.length+' findings in '+Object.keys(group).length+' groups (state | kind | what); '+nPinned+' pinned, '+nNew+' new'+(STRICT?' [STRICT: pins ignored]':'')+'; '+stale.length+' STALE pin(s) no longer firing'+(stale.length?': '+stale.slice(0,12).join(' ;; '):''));
  L.note('time: '+Math.round(tDrive/1000)+' s reaching the states, '+Math.round(tCells/1000)+' s reading the cells');
  L.note('TC-R248e height cap: '+nCapped+' board reading(s) were in a listed height-capped cell, centred and at least as wide as listed');
  const byKind={};for(const f of all)byKind[f.kind]=(byKind[f.kind]||0)+1;L.note('TC-R248 by kind: '+JSON.stringify(byKind));
}
module.exports={run,LAUNCHES,SIZES,STATES,KINDS,MEASURE,PINFILE,drivers:D};
