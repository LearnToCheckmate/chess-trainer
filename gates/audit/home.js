// gates/audit/home.js - the audit of Home and Discover on the live bundle (HANDOFF 0c): every state of
// gates/drive/home.js at Kunal's geometry (375x679) and 390x844, the width/height-dependent states also at
// 320x568 and 430x932. One line per measurement:  MEASURE <geo> <state> <metric>=<value>
// and one PNG per state in gates/shots/audit/home/<geo>-<state>.png. PASS/FAIL lines at the end assert:
// zero app console errors in every state; Home fits its viewport (the overlay does not scroll) and the coach
// line is not cut at the fold; the NEW HERE card leaves Home (the overlay goes away); the floating 🎬/💬 cover no
// text or control (A-05); the tab bar buttons are 44px tall; the Tactics trainer (a board screen) has over<=0;
// and re-measure the known items A-04 (no ☰ on Home), A-11 (tile subtitle sizes), A-17..A-25 (text under 11px,
// the empty band under the Discover cards, the header 3-4px from the edge), X-12 (the picker scrolls at 320).
//   cd /home/user/chess-trainer && timeout 900 node gates/audit/home.js
'use strict';
const path=require('path'),fs=require('fs');
process.env.CT_SHOTS=path.join(__dirname,'..','shots','audit','home');
const L=require('../lib');const H=require('../drive/home');
const ALL=Object.keys(H.states);
const WIDTH_STATES=['home','home-bottom','home-look','home-look-piece','home-newhere','discover','discover-openings','discover-gambits','discover-gambits-end','discover-tactics','discover-tactics-end'];
const PLAN=[['kunal',ALL],['390',ALL],['se',WIDTH_STATES],['430',WIDTH_STATES]];
const R={};
const M=(geo,st,k,v)=>{R[geo]=R[geo]||{};R[geo][st]=R[geo][st]||{};R[geo][st][k]=v;console.log('MEASURE '+geo+' '+st+' '+k+'='+(typeof v==='object'?JSON.stringify(v):v));};
const r1=(x)=>Math.round(x*10)/10;

// the Home overlay's content: the coach line, the tiles and their icons, the fixed buttons and what they cover, the chips and the build line
async function homeChrome(b){return b.page.evaluate(()=>{
  const rc=(e)=>{const r=e.getBoundingClientRect();return {x:r1(r.left),y:r1(r.top),w:r1(r.width),h:r1(r.height),bottom:r1(r.bottom),right:r1(r.right)};};const r1=(x)=>Math.round(x*10)/10;
  const o={vh:innerHeight,vw:innerWidth};
  const home=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');o.homeUp=!!home;if(!home)return o;
  const btns=[...home.querySelectorAll('button')];
  const coach=btns.find(x=>/^🎓/.test((x.innerText||'').trim()));if(coach){o.coach=rc(coach);const tx=[...coach.querySelectorAll('span')].find(s=>/New to chess|Your coach|Streak/.test(s.innerText||''));if(tx){o.coach.text=(tx.innerText||'').trim();o.coach.textRect=rc(tx);o.coach.textClipped=tx.scrollWidth>tx.clientWidth+1;o.coach.fs=getComputedStyle(tx).fontSize;}o.coach.cutPx=Math.max(0,r1(o.coach.bottom-innerHeight));}
  const tiles=btns.filter(x=>x.querySelector('[data-ct^="tile-ic-"]'));o.tiles=tiles.map(t=>{const ic=t.querySelector('[data-ct^="tile-ic-"]');const box=ic.parentElement;const sub=t.lastElementChild;const lab=sub.previousElementSibling;return {k:ic.getAttribute('data-ct').slice(8),rect:rc(t),box:rc(box),ic:rc(ic),icFs:getComputedStyle(ic).fontSize,ink:ic.getAttribute('data-ink'),label:(lab.innerText||'').trim(),labelFs:getComputedStyle(lab).fontSize,sub:(sub.innerText||'').trim(),subFs:getComputedStyle(sub).fontSize,subLines:Math.round(sub.getBoundingClientRect().height/(parseFloat(getComputedStyle(sub).lineHeight)||parseFloat(getComputedStyle(sub).fontSize)*1.4))};});
  // glyph ink: paint the emoji on a canvas at its font and measure the opaque box
  o.ink=[...home.querySelectorAll('[data-ct^="tile-ic-"]')].map(s=>{const st=getComputedStyle(s);const fs=parseFloat(st.fontSize);const S=Math.ceil(fs*2);const c=document.createElement('canvas');c.width=S;c.height=S;const x=c.getContext('2d');x.font=st.fontWeight+' '+fs+'px '+st.fontFamily;x.textBaseline='middle';x.textAlign='center';x.fillText(s.textContent,S/2,S/2);const d=x.getImageData(0,0,S,S).data;let x0=S,x1=-1,y0=S,y1=-1;for(let y=0;y<S;y++)for(let xx=0;xx<S;xx++){if(d[(y*S+xx)*4+3]>40){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;if(y>y1)y1=y;}}return {k:s.getAttribute('data-ct').slice(8),glyph:s.textContent,fs,w:x1-x0+1,h:y1-y0+1};});
  const fixed=[...document.querySelectorAll('button')].filter(x=>getComputedStyle(x).position==='fixed');
  o.fixed=fixed.map(f=>{const fr=f.getBoundingClientRect();const hit=[];
    // every text node and every button whose box intersects the floating button (the build line, a chip, a picker chip)
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(!(n.textContent||'').trim())continue;const el=n.parentElement;if(!el||f.contains(el))continue;const rg=document.createRange();rg.selectNodeContents(n);const r=rg.getBoundingClientRect();if(r.width<1||r.height<1)continue;const ix=Math.min(r.right,fr.right)-Math.max(r.left,fr.left),iy=Math.min(r.bottom,fr.bottom)-Math.max(r.top,fr.top);if(ix>0&&iy>0){const z=parseInt(getComputedStyle(f).zIndex)||0;const top=document.elementFromPoint(Math.max(r.left,fr.left)+ix/2,Math.max(r.top,fr.top)+iy/2);hit.push({t:n.textContent.trim().slice(0,30),ix:r1(ix),iy:r1(iy),covered:!!top&&f.contains(top)});}}
    for(const x of document.querySelectorAll('button')){if(x===f||f.contains(x)||x.contains(f))continue;const r=x.getBoundingClientRect();if(r.width<2||r.height<2||r.width>300)continue;const ix=Math.min(r.right,fr.right)-Math.max(r.left,fr.left),iy=Math.min(r.bottom,fr.bottom)-Math.max(r.top,fr.top);if(ix>0&&iy>0){const top=document.elementFromPoint(Math.max(r.left,fr.left)+ix/2,Math.max(r.top,fr.top)+iy/2);hit.push({t:'BUTTON '+((x.innerText||x.title||'').replace(/\s+/g,' ').trim().slice(0,24)),ix:r1(ix),iy:r1(iy),covered:!!top&&f.contains(top)});}}
    return {t:(f.innerText||'').trim(),title:f.title,rect:rc(f),z:getComputedStyle(f).zIndex,hits:hit};});
  const wave=fixed.find(f=>f.title==='Sign in'||f.title==='Account');if(wave){o.wave=rc(wave);o.wave.title=wave.title;}
  const menu=[...document.querySelectorAll('button')].find(x=>/^☰$/.test((x.innerText||'').trim()));if(menu){const mr=menu.getBoundingClientRect();const top=document.elementFromPoint(mr.left+mr.width/2,mr.top+mr.height/2);const tb=top&&top.closest('button');o.menuUnder={rect:rc(menu),inHome:home.contains(menu),topIs:tb?(tb.title||(tb.innerText||'').trim().slice(0,12)):(top?top.tagName:'-')};}
  const homeMenu=home.querySelector('[data-ct="home-menu"]');o.homeMenu=homeMenu?rc(homeMenu):null;
  const look=home.querySelector('[data-ct="home-look"]');if(look)o.look=Object.assign(rc(look),{fs:getComputedStyle(look).fontSize,text:(look.innerText||'').trim()});
  const style=btns.find(x=>/^A\s*Style:/.test((x.innerText||'').replace(/\s+/g,' ').trim()));if(style)o.style=rc(style);
  const build=[...home.querySelectorAll('div')].find(d=>d.children.length===0&&/^Build #/.test((d.innerText||'').trim()));if(build)o.build=Object.assign(rc(build),{fs:getComputedStyle(build).fontSize,text:(build.innerText||'').trim()});
  const daily=btns.find(x=>/^Daily 3/.test((x.innerText||'').trim()));if(daily)o.daily=Object.assign(rc(daily),{text:(daily.innerText||'').replace(/\s+/g,' ').trim().slice(0,80)});
  const nh=btns.find(x=>/^NEW HERE/.test((x.innerText||'').trim()));if(nh)o.newhere=rc(nh);
  return o;});}

// the Discover screen: the header edges, the group cards, the band under them, the tab bar
async function discoverChrome(b){return b.page.evaluate(()=>{
  const r1=(x)=>Math.round(x*10)/10;const rc=(e)=>{const r=e.getBoundingClientRect();return {x:r1(r.left),y:r1(r.top),w:r1(r.width),h:r1(r.height),bottom:r1(r.bottom),right:r1(r.right)};};const o={};
  const hdr=[...document.querySelectorAll('div')].find(d=>/CHESS TRAINER/.test((d.innerText||'').trim())&&d.getBoundingClientRect().height<40&&d.getBoundingClientRect().height>10);
  if(hdr){o.header=rc(hdr);const w=document.createTreeWalker(hdr,NodeFilter.SHOW_TEXT);let n,first=null;while((n=w.nextNode())){if((n.textContent||'').trim()){const rg=document.createRange();rg.selectNodeContents(n);const r=rg.getBoundingClientRect();if(r.width>0&&(!first||r.left<first.x))first={t:n.textContent.trim().slice(0,14),x:r1(r.left)};}}o.header.firstText=first;o.header.leftGap=first?first.x:null;}
  const menu=[...document.querySelectorAll('button')].find(x=>/^☰$/.test((x.innerText||'').trim()));if(menu){o.menu=rc(menu);o.menu.rightGap=r1(innerWidth-o.menu.right);}
  const root=document.getElementById('root').firstElementChild;const rs=getComputedStyle(root);o.rootPad=rs.paddingLeft+'/'+rs.paddingRight;
  const cards=[...document.querySelectorAll('button')].filter(x=>/lessons$|\nNew$/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>100&&x.querySelector('div'));
  o.cards=cards.map(x=>{const ic=x.firstElementChild;const sub=x.lastElementChild;return Object.assign(rc(x),{t:x.innerText.split('\n')[1],icon:r1(ic.getBoundingClientRect().width),sub:(sub.innerText||'').trim(),subFs:getComputedStyle(sub).fontSize});});
  const bar=document.querySelector('div[style*="position: fixed"][style*="bottom: 0px"]');if(bar){const bs=getComputedStyle(bar);o.bar=Object.assign(rc(bar),{pb:bs.paddingBottom,pt:bs.paddingTop,minH:bs.minHeight});o.tabs=[...bar.querySelectorAll('button')].map(x=>{const lab=[...x.querySelectorAll('span,div')].find(e=>e.children.length===0&&(e.innerText||'').trim());return Object.assign(rc(x),{t:(x.innerText||'').trim(),labelFs:lab?getComputedStyle(lab).fontSize:null});});}
  if(cards.length&&o.bar)o.band=r1(o.bar.y-Math.max(...o.cards.map(c=>c.bottom)));
  const q=[...document.querySelectorAll('div')].find(d=>d.children.length===0&&/What do you want to learn/.test(d.innerText||''));if(q)o.question=Object.assign(rc(q),{fs:getComputedStyle(q).fontSize});
  return o;});}

// a lesson list: rows, heights, clipped text, the group header
async function listChrome(b){return b.page.evaluate(()=>{
  const r1=(x)=>Math.round(x*10)/10;const rows=[...document.querySelectorAll('button')].filter(x=>/^[♔♚]/.test((x.innerText||'').trim()));const hs={};const clipped=[];const namesClipped=[];
  for(const r of rows){const h=r1(r.getBoundingClientRect().height);hs[h]=(hs[h]||0)+1;const lines=(r.innerText||'').split('\n');const name=lines[1]||'';for(const d of r.querySelectorAll('div,span')){if(d.children.length)continue;const t=(d.innerText||'').trim();if(!t)continue;const st=getComputedStyle(d);if(d.scrollWidth>d.clientWidth+1&&st.overflow!=='visible'){const rec=t.slice(0,36)+' sw'+d.scrollWidth+'/cw'+d.clientWidth+' '+st.fontSize;clipped.push(rec);if(t===name)namesClipped.push(rec);}}}
  const first=rows[0];const fr=first?first.getBoundingClientRect():null;const de=document.scrollingElement;
  const back=[...document.querySelectorAll('button')].find(x=>/^‹ Back$/.test((x.innerText||'').trim()));const br=back?back.getBoundingClientRect():null;
  const secs=[...document.querySelectorAll('div')].filter(d=>d.children.length===0&&/^(After|Defences|Other|As White|As Black)/.test((d.innerText||'').trim())).map(d=>{const r=d.getBoundingClientRect();return {t:(d.innerText||'').trim().slice(0,30),fs:getComputedStyle(d).fontSize,y:r1(r.top)};});
  return {rows:rows.length,heights:hs,minH:rows.length?r1(Math.min(...rows.map(r=>r.getBoundingClientRect().height))):null,rowX:fr?r1(fr.left):null,rowW:fr?r1(fr.width):null,clipped:clipped.length,clippedSample:clipped.slice(0,3),namesClipped:namesClipped.length,namesClippedSample:namesClipped.slice(0,4),back:br?r1(br.width)+'x'+r1(br.height)+'@'+r1(br.left)+','+r1(br.top):null,docSh:de.scrollHeight,docCh:de.clientHeight,sections:secs.slice(0,6)};});}

// the Look and feel picker: does the card fit, the preview board, the selected chips
async function lookChrome(b){return b.page.evaluate(()=>{
  const r1=(x)=>Math.round(x*10)/10;const l=document.querySelector('[data-ct="look"]');if(!l)return null;const card=l.firstElementChild;const cr=card.getBoundingClientRect();const bd=document.querySelector('[data-ct="look-board"]');const br=bd?bd.getBoundingClientRect():null;
  const chips=[...document.querySelectorAll('[data-ct="look-colours"] button, [data-ct="look-pieces"] button')];const on=chips.filter(x=>x.getAttribute('aria-pressed')==='true').map(x=>x.getAttribute('data-ct'));
  const cs=chips.map(x=>{const r=x.getBoundingClientRect();return {id:x.getAttribute('data-ct'),w:r1(r.width),h:r1(r.height),y:r1(r.top),bottom:r1(r.bottom),below:r.bottom>innerHeight};});
  const img=bd?bd.querySelector('img'):null;
  return {card:{x:r1(cr.left),y:r1(cr.top),w:r1(cr.width),h:r1(cr.height),bottom:r1(cr.bottom),sh:card.scrollHeight,ch:card.clientHeight,st:card.scrollTop,scrolls:card.scrollHeight>card.clientHeight+1,over:card.scrollHeight-card.clientHeight},
    board:br?{x:r1(br.left),y:r1(br.top),w:r1(br.width),h:r1(br.height),light:getComputedStyle(bd.children[0]).backgroundColor,dark:getComputedStyle(bd.children[1]).backgroundColor,pieceSrc:img?img.getAttribute('src').slice(0,48):null}:null,
    on,chipMin:r1(Math.min(...cs.map(c=>Math.min(c.w,c.h)))),chipsBelowFold:cs.filter(c=>c.below).map(c=>c.id),chips:cs.length};});}

async function measure(b,geo,st){
  const m=await b.metrics();const ov=await H.overlay(b);const sb=await H.scrollBox(b);
  M(geo,st,'errs',b.errs.length);if(b.errs.length)M(geo,st,'errs.text',b.errs.slice(0,3));
  M(geo,st,'homeUp',!!ov);if(ov){M(geo,st,'home.scrollTop',ov.st);M(geo,st,'home.over',ov.over);}
  M(geo,st,'over.over',m.over.over);M(geo,st,'doc.over',sb.doc.sh-sb.doc.ch);M(geo,st,'doc.scrollTop',sb.doc.st);
  if(m.board){M(geo,st,'board.w',m.board.w);M(geo,st,'board.top',m.board.top);M(geo,st,'board.left',m.board.left);}
  const btns=await H.btnRects(b);M(geo,st,'buttons',btns.map(x=>x.t.slice(0,18)).join('|').slice(0,400));
  const tabbar=await b.tabBarVisible();M(geo,st,'tabbar',tabbar);
  const small=(await H.textNodes(b,11.01)).filter(x=>x.visible);M(geo,st,'text.under11',small.map(x=>x.t.slice(0,24)+' '+x.fs+'px@'+x.x+','+x.y+' '+x.w+'x'+x.h).join('; ')||'none');M(geo,st,'text.under11.n',small.length);
  if(ov&&/^home/.test(st)&&!/look/.test(st)){const c=await homeChrome(b);
    if(c.coach){M(geo,st,'coach.rect',c.coach.w+'x'+c.coach.h+'@'+c.coach.x+','+c.coach.y);M(geo,st,'coach.bottom',c.coach.bottom);M(geo,st,'coach.cutPx',c.coach.cutPx);M(geo,st,'coach.text',c.coach.text);M(geo,st,'coach.textClipped',c.coach.textClipped);M(geo,st,'coach.fs',c.coach.fs);}
    if(c.tiles&&c.tiles.length){M(geo,st,'tiles',c.tiles.map(t=>t.label+' '+t.rect.w+'x'+t.rect.h+'@'+t.rect.x+','+t.rect.y).join('; '));M(geo,st,'tile.box',c.tiles.map(t=>t.k+' '+t.box.w+'x'+t.box.h).join('; '));M(geo,st,'tile.icFs',c.tiles.map(t=>t.k+' '+t.icFs+' ink'+t.ink).join('; '));M(geo,st,'tile.labelFs',c.tiles[0].labelFs);M(geo,st,'tile.subFs',c.tiles.map(t=>t.k+' '+t.subFs+' lines'+t.subLines).join('; '));}
    if(c.ink)M(geo,st,'tile.ink',c.ink.map(i=>i.k+' '+i.glyph+' '+i.fs+'px ink '+i.w+'x'+i.h).join('; '));
    if(c.fixed){for(const f of c.fixed){const id=f.t||f.title;M(geo,st,'fixed.'+id+'.rect',f.rect.w+'x'+f.rect.h+'@'+f.rect.x+','+f.rect.y+' z'+f.z);M(geo,st,'fixed.'+id+'.covers',f.hits.filter(h=>h.covered).map(h=>h.t+' ('+h.ix+'x'+h.iy+')').join('; ')||'nothing');}}
    if(c.wave)M(geo,st,'wave',c.wave.w+'x'+c.wave.h+'@'+c.wave.x+','+c.wave.y+' title='+c.wave.title);
    if(c.menuUnder)M(geo,st,'menu.under',(c.menuUnder.inHome?'IN-HOME ':'UNDER-OVERLAY ')+c.menuUnder.rect.w+'x'+c.menuUnder.rect.h+'@'+c.menuUnder.rect.x+','+c.menuUnder.rect.y+' topIs='+c.menuUnder.topIs);
    M(geo,st,'home.menuButton',c.homeMenu?JSON.stringify(c.homeMenu):'none');
    if(c.look)M(geo,st,'look.chip',c.look.w+'x'+c.look.h+'@'+c.look.x+','+c.look.y+' '+c.look.fs);
    if(c.style)M(geo,st,'style.chip',c.style.w+'x'+c.style.h+'@'+c.style.x+','+c.style.y);
    if(c.build)M(geo,st,'build.line',c.build.w+'x'+c.build.h+'@'+c.build.x+','+c.build.y+' '+c.build.fs+' '+c.build.text);
    if(c.daily)M(geo,st,'daily3',c.daily.w+'x'+c.daily.h+'@'+c.daily.x+','+c.daily.y+' '+c.daily.text);
    if(c.newhere)M(geo,st,'newhere',c.newhere.w+'x'+c.newhere.h+'@'+c.newhere.x+','+c.newhere.y);
  }
  if(/look/.test(st)){const k=await lookChrome(b);if(k){M(geo,st,'look.card',k.card.w+'x'+k.card.h+'@'+k.card.x+','+k.card.y+' sh'+k.card.sh+'/ch'+k.card.ch+' st'+k.card.st);M(geo,st,'look.card.over',k.card.over);M(geo,st,'look.card.scrolls',k.card.scrolls);if(k.board){M(geo,st,'look.board',k.board.w+'x'+k.board.h+'@'+k.board.x+','+k.board.y);M(geo,st,'look.board.colours',k.board.light+' / '+k.board.dark);M(geo,st,'look.board.piece',k.board.pieceSrc);}M(geo,st,'look.on',k.on.join(','));M(geo,st,'look.chipMin',k.chipMin);M(geo,st,'look.chipsBelowFold',k.chipsBelowFold.join(',')||'none');
      const c=await homeChrome(b);if(c.fixed)for(const f of c.fixed){const id=f.t||f.title;M(geo,st,'fixed.'+id+'.covers',f.hits.filter(h=>h.covered).map(h=>h.t+' ('+h.ix+'x'+h.iy+')').join('; ')||'nothing');}}
    else M(geo,st,'look.card','NOT OPEN');}
  if(/^discover$|^discover-back$|^home-daily3-fresh$/.test(st)){const d=await discoverChrome(b);
    if(d.header)M(geo,st,'header',d.header.w+'x'+d.header.h+'@'+d.header.x+','+d.header.y+' firstText='+JSON.stringify(d.header.firstText)+' leftGap='+d.header.leftGap);
    if(d.menu)M(geo,st,'menu',d.menu.w+'x'+d.menu.h+'@'+d.menu.x+','+d.menu.y+' rightGap='+d.menu.rightGap);M(geo,st,'root.pad',d.rootPad);
    if(d.question)M(geo,st,'question',d.question.fs+' '+d.question.w+'x'+d.question.h+'@'+d.question.x+','+d.question.y);
    M(geo,st,'cards',(d.cards||[]).map(c=>c.t+' '+c.w+'x'+c.h+'@'+c.x+','+c.y+' icon'+c.icon+' sub"'+c.sub+'" '+c.subFs).join('; '));
    if(d.band!=null)M(geo,st,'band.empty',d.band);
    if(d.bar){M(geo,st,'tabbar.rect',d.bar.w+'x'+d.bar.h+'@'+d.bar.x+','+d.bar.y+' pb='+d.bar.pb+' pt='+d.bar.pt);M(geo,st,'tabbar.tabs',d.tabs.map(t=>t.t+' '+t.w+'x'+t.h+'@'+t.x+','+t.y+' label'+t.labelFs).join('; '));M(geo,st,'tabbar.minH',Math.min(...d.tabs.map(t=>t.h)));}
  }
  if(/^discover-(openings|gambits|endgames)/.test(st)){const l=await listChrome(b);M(geo,st,'list.rows',l.rows);M(geo,st,'list.heights',l.heights);M(geo,st,'list.minH',l.minH);M(geo,st,'list.rowX',l.rowX);M(geo,st,'list.rowW',l.rowW);M(geo,st,'list.clipped',l.clipped);M(geo,st,'list.clippedSample',l.clippedSample);M(geo,st,'list.namesClipped',l.namesClipped);if(l.namesClipped)M(geo,st,'list.namesClippedSample',l.namesClippedSample);M(geo,st,'list.back',l.back);M(geo,st,'list.sections',l.sections.map(s=>s.t+' '+s.fs).join('; '));}
  if(/^discover-tactics/.test(st)){const t=await b.page.evaluate(()=>{const bar=document.querySelector('div[style*="position: fixed"][style*="bottom: 0px"]');const br=bar?bar.getBoundingClientRect():null;const g=[...document.querySelectorAll('div')].find(d=>/repeat\(8,/.test(d.style.gridTemplateColumns||''));const gr=g?g.getBoundingClientRect():null;return {barTop:br?br.top:null,boardBottom:gr?gr.bottom:null,underBar:(br&&gr)?Math.max(0,Math.round((gr.bottom-br.top)*10)/10):null};});M(geo,st,'tactics.boardBottom',t.boardBottom);M(geo,st,'tactics.barTop',t.barTop);M(geo,st,'tactics.boardUnderBar',t.underBar);}
  if(/^home-(newhere|coachline|daily3)/.test(st)){const w=await b.page.evaluate(()=>{const e=document.elementFromPoint(innerWidth/2,innerHeight/2);const h=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');return {centreIs:e?(e.tagName+' '+(e.innerText||'').replace(/\s+/g,' ').slice(0,24)):'-',underHome:!!(h&&e&&h.contains(e))};});M(geo,st,'after.centre',w.centreIs);M(geo,st,'after.homeStillUp',w.underHome);M(geo,st,'after.cts',(await b.cts()).filter(x=>!/^tile-ic|^home-look/.test(x)).join(' ').slice(0,200)||'none');}
  await b.shot(geo+'-'+st);
}

L.run(async()=>{
  fs.mkdirSync(process.env.CT_SHOTS,{recursive:true});
  for(const [geo,states] of PLAN){
    const b=await L.launch({geo,name:'audit-home-'+geo});await b.open();
    console.log('# '+geo+' '+JSON.stringify(b.geo)+' stamp '+(await b.stamp()));
    for(const st of states){try{await H.states[st](b);await measure(b,geo,st);}catch(e){M(geo,st,'THREW',String(e).slice(0,200));try{await b.shot(geo+'-'+st+'-threw');}catch(_){}}}
    await b.close();
  }
  // ---- assertions ----
  const g=(geo,st,k)=>R[geo]&&R[geo][st]?R[geo][st][k]:undefined;
  for(const geo of Object.keys(R))for(const st of Object.keys(R[geo])){const n=g(geo,st,'errs');L.say(n===0,'no app console errors '+geo+' '+st,n);}
  for(const geo of ['kunal','390','se','430']){if(!R[geo])continue;
    const ho=g(geo,'home','home.over');L.say(ho<=0,'Home fits at '+geo+' (overlay scrollHeight - clientHeight)',ho);
    const cut=g(geo,'home','coach.cutPx');L.say(cut===0,'coach line not cut at the fold at '+geo,'cutPx='+cut+' bottom='+g(geo,'home','coach.bottom'));
    const nh=g(geo,'home-newhere','after.homeStillUp');L.say(nh===false,'NEW HERE? START HERE leaves Home at '+geo,'homeStillUp='+nh+' centre='+g(geo,'home-newhere','after.centre'));
    for(const st of ['home-bottom','home-look','home-look-piece'])for(const id of ['🎬','💬']){const v=g(geo,st,'fixed.'+id+'.covers');if(v===undefined)continue;L.say(v==='nothing','floating '+id+' covers nothing at '+geo+' '+st,v);}
    const mh=g(geo,'discover','tabbar.minH');if(mh!==undefined)L.say(mh>=44,'tab bar buttons >= 44px tall at '+geo,mh);
    const to=g(geo,'discover-tactics','over.over');if(to!==undefined)L.say(to<=0,'Tactics trainer (a board screen) has over<=0 at '+geo,to+' boardUnderBar='+g(geo,'discover-tactics','tactics.boardUnderBar'));
    const mu=g(geo,'home','menu.under');if(mu!==undefined)L.say(/UNDER-OVERLAY/.test(mu)&&g(geo,'home','home.menuButton')==='none','A-04: no ☰ on Home at '+geo+' (the DOM ☰ is Discover\'s, under the overlay)',mu);
    const lg=g(geo,'discover','header');if(lg!==undefined)L.note('A-24/A-25 header at '+geo+': '+lg+' | menu '+g(geo,'discover','menu')+' | root.pad '+g(geo,'discover','root.pad'));
    const band=g(geo,'discover','band.empty');if(band!==undefined)L.note('A-24 empty band under the Discover cards at '+geo+': '+band+'px');
    const lk=g(geo,'home-look','look.card.over');if(lk!==undefined)L.note('X-12 picker card at '+geo+': over='+lk+' scrolls='+g(geo,'home-look','look.card.scrolls')+' chipsBelowFold='+g(geo,'home-look','look.chipsBelowFold'));
    const l1=g(geo,'home-look','look.board.colours'),l2=g(geo,'home-look-chip','look.board.colours');if(l1!==undefined&&l2!==undefined)L.say(l1!==l2,'colour chip recolours the preview board at '+geo,l1+' -> '+l2);
    const p1=g(geo,'home-look','look.board.piece'),p2=g(geo,'home-look-piece','look.board.piece');if(p1!==undefined&&p2!==undefined)L.say(p1!==p2,'piece chip changes the preview pieces at '+geo,g(geo,'home-look-piece','look.on'));
    for(const st of ['home','discover','discover-openings'])if(g(geo,st,'text.under11.n')!==undefined)L.note('A-17..A-25 text under 11px at '+geo+' '+st+': '+g(geo,st,'text.under11'));
    if(g(geo,'home','tile.ink'))L.note('tile icon ink at '+geo+': '+g(geo,'home','tile.ink')+' | subFs '+g(geo,'home','tile.subFs'));
  }
},'AUDIT-HOME');
