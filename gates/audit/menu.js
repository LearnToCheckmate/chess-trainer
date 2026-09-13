// gates/audit/menu.js - the audit of the Menu sheet (☰), its settings rows, the Layout readout / overlay, the eval
// graph switch, the sign-in button, the Look and feel picker and the feedback sheet on the live bundle (HANDOFF 0c):
// every state of gates/drive/menu.js at Kunal's geometry (375x679) and 390x844, the width/height-dependent states
// also at 320x568 and 430x932. One line per measurement:  MEASURE <geo> <state> <metric>=<value>
// and one PNG per state in gates/shots/audit/menu/<geo>-<state>.png. PASS/FAIL lines at the end re-measure the known
// items (A-16 sheet ends above the screen bottom, A-04 no ☰ on Home, A-11 tap targets inside the menu, X-12 the Look
// picker on small phones, A-2x the readout's 'board 368' with no board on screen) and assert the invariants (a board
// under the sheet keeps its top and width when the sheet closes, over<=0 on board screens, zero app errors).
//   cd /home/user/chess-trainer && timeout 900 node gates/audit/menu.js
'use strict';
const path=require('path'),fs=require('fs');
process.env.CT_SHOTS=path.join(__dirname,'..','shots','audit','menu');
const L=require('../lib');const M=require('../drive/menu');
const ALL=Object.keys(M.states);
const WIDTH_STATES=['home','menu-discover','menu-bottom','menu-look','menu-readout','feedback-home','menu-play-live'];
const PLAN=[['kunal',ALL],['390',ALL],['se',WIDTH_STATES],['430',WIDTH_STATES]];
const BOARD_UNDER=/^(menu-play-live|menu-lesson|menu-review-more)$/;
const R={};
const M_=(geo,st,k,v)=>{R[geo]=R[geo]||{};R[geo][st]=R[geo][st]||{};R[geo][st][k]=v;console.log('MEASURE '+geo+' '+st+' '+k+'='+(typeof v==='object'?JSON.stringify(v):v));};
const r1=(x)=>Math.round(x*10)/10;
const parseNums=(txt,key)=>{const m=(txt||'').match(new RegExp(key+'\\s+([\\d.]+)'));return m?parseFloat(m[1]):null;};

// the Look and feel picker: its sheet, the drawn board, the chip labels (X-12: are they truncated?)
async function lookInfo(b){return b.page.evaluate(()=>{const bd=document.querySelector('[data-ct="look"]');if(!bd)return null;const s=bd.firstElementChild;const r=s.getBoundingClientRect();
  const lab=(sel)=>[...document.querySelectorAll(sel+' button')].map(x=>{const q=x.getBoundingClientRect();const sp=[...x.querySelectorAll('span')].find(z=>z.children.length===0&&(z.innerText||'').trim());const st=sp?getComputedStyle(sp):null;return {t:(x.innerText||'').trim().slice(0,14),w:Math.round(q.width),h:Math.round(q.height),fs:st?st.fontSize:'',sw:sp?sp.scrollWidth:0,cw:sp?sp.clientWidth:0,clipped:sp?sp.scrollWidth>sp.clientWidth+1:false};});
  const bb=document.querySelector('[data-ct="look-board"]');const br=bb?bb.getBoundingClientRect():null;
  return {sheet:{y:Math.round(r.top*10)/10,bottom:Math.round(r.bottom*10)/10,w:Math.round(r.width),h:Math.round(r.height*10)/10,gapBelow:Math.round((innerHeight-r.bottom)*10)/10,sh:s.scrollHeight,ch:s.clientHeight,inner:s.scrollHeight-s.clientHeight},board:br?{w:Math.round(br.width*10)/10,top:Math.round(br.top*10)/10,left:Math.round(br.left*10)/10}:null,colours:lab('[data-ct="look-colours"]'),pieces:lab('[data-ct="look-pieces"]')};});}
// the feedback / account sheet: does it fit, the textarea and the button
async function sheet1100(b,re){const o=await M.overlay1100(b,re);if(!o)return null;const extra=await b.page.evaluate((src)=>{const re=new RegExp(src);const bd=[...document.querySelectorAll('div')].find(d=>{const st=getComputedStyle(d);return st.position==='fixed'&&st.zIndex==='1100'&&re.test(d.innerText||'');});const s=bd.firstElementChild;const ta=s.querySelector('textarea');const btns=[...s.querySelectorAll('button')].map(x=>{const q=x.getBoundingClientRect();return (x.innerText||'').trim().slice(0,22)+' '+Math.round(q.width)+'x'+Math.round(q.height*10)/10;});const ctx=[...s.querySelectorAll('div')].find(d=>d.children.length===0&&/build=/.test(d.innerText||''));return {ta:ta?Math.round(ta.getBoundingClientRect().height):null,btns,ctx:ctx?(ctx.innerText||'').trim():null,ovf:getComputedStyle(bd).overflowY};},re.source);return Object.assign(o,extra);}
async function tabbarHit(b){return b.page.evaluate(()=>{const bt=[...document.querySelectorAll('div[style*="position: fixed"][style*="bottom: 0px"] button')].find(x=>/^Home$/.test((x.innerText||'').trim()));if(!bt)return null;const r=bt.getBoundingClientRect();if(r.width<1)return {visible:false};const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {visible:r.bottom>0&&r.top<innerHeight,top:Math.round(r.top),hit:hit?(hit===bt||bt.contains(hit)?'tab':hit.tagName+' z'+getComputedStyle(hit).zIndex):'none'};});}
async function msgLeaf(b,re){const ls=await M.leaves(b);const l=ls.find(x=>re.test(x.t));return l?l.t:null;}

async function measure(b,geo,st){
  const m=await b.metrics();
  if(m.board){M_(geo,st,'board.w',m.board.w);M_(geo,st,'board.top',m.board.top);M_(geo,st,'board.left',m.board.left);}else M_(geo,st,'board','none');
  M_(geo,st,'over.over',m.over.over);M_(geo,st,'errs',b.errs.length);if(b.errs.length)M_(geo,st,'errs.text',b.errs.slice(0,3));
  // where the ☰ is on this screen (and whether something covers it)
  const mb=await M.menuBtnRects(b);M_(geo,st,'menubtns',mb.map(x=>(x.ct||'☰')+' '+x.w+'x'+x.h+'@'+x.x+','+x.y+(x.vis?'':' hidden')+(x.covered?' COVERED-BY '+x.coveredBy:'')).join('; ')||'none');
  M_(geo,st,'menubtns.visibleUncovered',mb.filter(x=>x.vis&&!x.covered).length);
  const s=await M.sheet(b);M_(geo,st,'sheet',s?{y:s.y,bottom:s.bottom,w:s.w,h:s.h}:'none');
  if(s){
    M_(geo,st,'sheet.gapBelow',s.gapBelow);M_(geo,st,'sheet.gapAbove',s.gapAbove);M_(geo,st,'sheet.scrollH',s.sh);M_(geo,st,'sheet.clientH',s.ch);M_(geo,st,'sheet.inner',s.inner);M_(geo,st,'sheet.scrollTop',s.st);M_(geo,st,'sheet.css',s.marginTop+' / '+s.maxHeight+' / mb '+s.marginBottom+' / backdrop pad '+s.padTop+' '+s.padBottom);
    const rows=await M.rows(b);M_(geo,st,'rows',rows.length);
    const small=rows.filter(x=>x.h<40);M_(geo,st,'rows.under40',small.map(x=>x.t.slice(0,18)+' '+x.w+'x'+x.h).join('; ')||'none');M_(geo,st,'rows.under40.count',small.length);
    const by=(re)=>rows.find(x=>re.test(x.t));
    const close=by(/^✕$/);if(close)M_(geo,st,'close.rect',close.w+'x'+close.h+'@'+close.x+','+close.y);
    const look=by(/^Look and feel/);if(look)M_(geo,st,'look.h',look.h);
    const signin=by(/Sign in with Google|Sign-in unavailable/);if(signin)M_(geo,st,'signin',signin.t+' '+signin.w+'x'+signin.h+(signin.dis?' DISABLED':''));
    const eg=by(/^Eval graph/);if(eg)M_(geo,st,'evalgraph.row',eg.t+' h'+eg.h);
    const cd=by(/^Cell depth/);if(cd)M_(geo,st,'celldepth.row',cd.t+' h'+cd.h);
    const so=by(/^Sound/);if(so)M_(geo,st,'sound.row',so.t+' h'+so.h);
    const lr=by(/^Layout readout/);if(lr)M_(geo,st,'readout.row',lr.t+' h'+lr.h);
    const lo=by(/^Layout overlay/);if(lo)M_(geo,st,'overlay.row',lo.t+' h'+lo.h);
    const chips=rows.filter(x=>/^(Classic|Merida|Chessnut|Spatial|Symbol)$/.test(x.t));if(chips.length)M_(geo,st,'piecechips.h',chips.map(x=>x.h).join(','));
    const links=rows.filter(x=>x.tag==='A');if(links.length)M_(geo,st,'footerlinks.h',links.map(x=>x.t+' '+x.h).join(','));
    const colours=rows.filter(x=>/^(Forest|Walnut|Ocean|Dusk|Coral|Graphite|Slate|Stone Keep|Parchment|Dragonstone|Royal|Candy)$/.test(x.t));M_(geo,st,'colourchips',colours.length+' x '+(colours[0]?colours[0].w+'x'+colours[0].h:'-'));
    const skins=rows.filter(x=>/^(🔭♟️|📜⚔️)/.test(x.t));if(skins.length)M_(geo,st,'skins.h',skins.map(x=>x.h).join(','));
    const leaves=await M.leaves(b);
    const tiny=leaves.filter(x=>parseFloat(x.fs)<12);M_(geo,st,'text.under12',tiny.map(x=>x.t.slice(0,30)+' '+x.fs).join('; ')||'none');
    const clipped=leaves.filter(x=>x.sw>x.cw+1);M_(geo,st,'text.clipped',clipped.map(x=>x.t.slice(0,30)+' sw'+x.sw+'/cw'+x.cw).join('; ')||'none');
    const build=leaves.find(x=>/^Build #/.test(x.t));if(build)M_(geo,st,'build.line',build.t+' fs'+build.fs+' y'+build.y);
    const colourLabel=leaves.find(x=>/^Board colors/.test(x.t));if(colourLabel)M_(geo,st,'colours.label',colourLabel.t);
    const gs=leaves.find(x=>/^GAME SETUP$/i.test(x.t));M_(geo,st,'gamesetup.section',!!gs);
    const tb=await tabbarHit(b);M_(geo,st,'tabbar',tb);
    // the last row's bottom vs the sheet's bottom when scrolled to the end (is anything hidden under the sheet's edge?)
    if(st==='menu-bottom'){const last=Math.max(...rows.map(x=>x.y+x.h));M_(geo,st,'lastRow.bottom',r1(last));M_(geo,st,'lastRow.underSheetEdge',r1(Math.max(0,last-s.bottom)));if(build)M_(geo,st,'build.underSheetEdge',r1(Math.max(0,build.y+build.h-s.bottom)));}
  }
  if(/^(menu-readout|card7)$/.test(st)){const ro=await M.readoutText(b);M_(geo,st,'readout',ro?ro.lines.join(' | '):'none');
    if(ro){M_(geo,st,'readout.rect','y'+ro.y+' h'+ro.h+' w'+ro.w+' fs'+ro.fs);M_(geo,st,'readout.inViewport',ro.y>=0&&ro.y+ro.h<=b.geo.h);M_(geo,st,'readout.board',parseNums(ro.text,'board'));M_(geo,st,'readout.square',parseNums(ro.text,'square'));M_(geo,st,'readout.clipped',ro.sw>ro.cw+1);const ink=ro.lines.find(x=>/^tile ink/.test(x));M_(geo,st,'readout.tileink',ink||'MISSING');M_(geo,st,'readout.boardOnScreen',m.board?m.board.w:'none');}}
  if(/^(menu-overlay-on|overlay-play-live)$/.test(st)){const ov=await M.overlayText(b);M_(geo,st,'overlay',ov?ov.text:'none');
    if(ov){const bw=parseNums(ov.text,'board'),sq=parseNums(ov.text,'sq'),gap=(ov.text.match(/gap (\d+)\|(\d+)/)||[]).slice(1).map(Number);M_(geo,st,'overlay.board',bw);M_(geo,st,'overlay.sq',sq);M_(geo,st,'overlay.gap',gap.join('|'));
      if(m.board){M_(geo,st,'overlay.vs.board.w',r1(bw-m.board.w));M_(geo,st,'overlay.vs.board.left',r1(gap[0]-m.board.left));const bd=await b.board();M_(geo,st,'overlay.vs.board.sq',r1(sq-bd.sq));}
      M_(geo,st,'overlay.strips',ov.leaf.map(x=>x.t.slice(0,24)+' @'+x.x+','+x.y+' '+x.w+'x'+x.h).join('; '));}}
  if(st==='menu-look'){const lk=await lookInfo(b);M_(geo,st,'look',lk?lk.sheet:'none');if(lk){M_(geo,st,'look.board',lk.board);M_(geo,st,'look.colours',lk.colours.map(x=>x.t+' '+x.w+'x'+x.h+(x.clipped?' CLIPPED sw'+x.sw+'/cw'+x.cw:'')).join('; '));M_(geo,st,'look.pieces',lk.pieces.map(x=>x.t+' '+x.w+'x'+x.h+(x.clipped?' CLIPPED sw'+x.sw+'/cw'+x.cw:'')).join('; '));M_(geo,st,'look.clippedLabels',lk.colours.concat(lk.pieces).filter(x=>x.clipped).map(x=>x.t).join(',')||'none');M_(geo,st,'look.labelFs',lk.colours[0]?lk.colours[0].fs:'-');}}
  if(/^feedback/.test(st)){const fb=await sheet1100(b,/Send feedback/);M_(geo,st,'feedback',fb?{y:fb.y,bottom:fb.bottom,w:fb.w,h:fb.h,gapBelow:fb.gapBelow,inner:fb.inner,ovf:fb.ovf}:'none');if(fb){M_(geo,st,'feedback.fits',fb.y>=0&&fb.bottom<=b.geo.h);M_(geo,st,'feedback.textarea.h',fb.ta);M_(geo,st,'feedback.buttons',fb.btns.join('; '));M_(geo,st,'feedback.ctx',fb.ctx);M_(geo,st,'feedback.text',fb.text.slice(0,160));}}
  if(st==='menu-skin-pro'){const ac=await sheet1100(b,/^Account/);M_(geo,st,'account',ac?{y:ac.y,bottom:ac.bottom,h:ac.h,gapBelow:ac.gapBelow,inner:ac.inner,ovf:ac.ovf}:'none');if(ac)M_(geo,st,'account.buttons',ac.btns.join('; '));}
  if(st==='menu-signin'){M_(geo,st,'signin.msg',await msgLeaf(b,/Sign-in|Sync your|sign in|retry|unavailable/i));}
  if(st==='menu-share'){M_(geo,st,'share.msg',await msgLeaf(b,/Link copied|Copy the link|address bar/i));}
  if(st==='menu-colour-forest'){M_(geo,st,'colours.after',await msgLeaf(b,/^Board colors/));}
  // a board under the sheet: close the sheet and re-measure (the board must keep its top and width)
  if(BOARD_UNDER.test(st)&&s&&m.board){await M.tapRow(b,/^✕$/,500);const m2=await b.metrics();M_(geo,st,'afterClose.board',m2.board);M_(geo,st,'afterClose.moved',!m2.board||m2.board.w!==m.board.w||m2.board.top!==m.board.top);M_(geo,st,'afterClose.over',m2.over.over);M_(geo,st,'afterClose.sheet',!!(await M.sheet(b)));}
}

L.run(async()=>{
  for(const [geo,states] of PLAN){
    const b=await L.launch({geo,name:'audit-menu-'+geo});await b.open();
    M_(geo,'boot','stamp',await b.stamp());M_(geo,'boot','viewport',b.geo.w+'x'+b.geo.h);
    for(const st of states){
      const e0=b.errs.length;
      try{await M.states[st](b);}catch(e){M_(geo,st,'DRIVE-ERROR',String(e).split('\n')[0].slice(0,200));await b.shot(geo+'-'+st+'-ERR').catch(()=>{});continue;}
      await measure(b,geo,st);M_(geo,st,'errs.new',b.errs.length-e0);
      await b.shot(geo+'-'+st);
    }
    // per-geometry asserts
    const g=R[geo];const sd=g['menu-discover']||{};
    if(sd.sheet&&sd.sheet!=='none'){L.say(sd['sheet.gapBelow']<=11,geo+': A-16 the menu sheet ends <=10px above the screen bottom (gapBelow '+sd['sheet.gapBelow']+', bottom '+sd.sheet.bottom+' of '+b.geo.h+')');
      L.say(sd['rows.under40.count']===0,geo+': A-11 every tap target inside the menu is >=40px tall ('+sd['rows.under40.count']+' under: '+String(sd['rows.under40']).slice(0,120)+')');
      L.say(sd.tabbar&&sd.tabbar.visible===false||!sd.tabbar,geo+': the tab bar is not shown under the open sheet',sd.tabbar);}
    const sh=g['home']||{};L.say(sh['menubtns.visibleUncovered']>=1,geo+': A-04 Home has a reachable ☰ ('+sh.menubtns+')');
    for(const st of states){const x=g[st]||{};if(x['afterClose.moved']!==undefined)L.say(x['afterClose.moved']===false,geo+': '+st+' the board keeps its top/width when the sheet closes',{open:x['board.w']+'@'+x['board.top'],closed:x['afterClose.board']});
      if(BOARD_UNDER.test(st)||st==='overlay-play-live')L.say(x['over.over']<=0,geo+': '+st+' over<=0 on a board screen ('+x['over.over']+')');}
    const rd=g['menu-readout']||{};if(rd.readout)L.say(rd['readout.boardOnScreen']!=='none'||rd['readout.board']==null,geo+': A-2x the readout prints no board width when no board is on screen (prints board '+rd['readout.board']+', on screen: '+rd['readout.boardOnScreen']+')');
    const ov=g['overlay-play-live']||{};if(ov.overlay&&ov.overlay!=='none')L.say(Math.abs(ov['overlay.vs.board.w'])<=1&&Math.abs(ov['overlay.vs.board.sq'])<=0.15,geo+': the overlay strip prints the painted board (board '+ov['overlay.board']+' sq '+ov['overlay.sq']+' gap '+ov['overlay.gap']+' vs painted '+ov['board.w']+'@'+ov['board.left']+')');
    const lk=g['menu-look']||{};if(lk.look&&lk.look!=='none')L.say(lk['look.clippedLabels']==='none',geo+': X-12 no chip label in the Look picker is clipped ('+lk['look.clippedLabels']+')');
    const fb=g['feedback-home']||{};if(fb.feedback&&fb.feedback!=='none')L.say(fb['feedback.fits']===true,geo+': the feedback sheet fits the screen',fb.feedback);
    L.say(b.errs.length===0,geo+': zero app console errors across the menu states',b.errs.slice(0,3));
    await b.close();
  }
  fs.writeFileSync(path.join(process.env.CT_SHOTS,'measures.json'),JSON.stringify(R,null,1));
  L.note('measures written to '+path.join(process.env.CT_SHOTS,'measures.json'));
},'AUDIT-MENU');
