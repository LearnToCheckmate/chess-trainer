// gates/drive/menu.js - drives the Menu sheet (☰), its settings rows, the Layout readout / overlay, the eval graph
// switch, the sign-in button, the Look and feel picker and the feedback 💬 sheet on the bundle under test. Every
// state function takes a launched+opened `b` from gates/lib.js and puts the app into that state from wherever it is.
//
//   const M=require('./drive/menu');  await M.states['menu-bottom'](b);  const s=await M.sheet(b);
//
// WHERE ☰ IS (measured on #372): the Discover, Puzzles and Review screens carry a ☰ at the right of their header
// (title "Menu & settings", 38x30, position absolute); a live Play game carries data-ct play-menu (34x30) in its top
// bar; a lesson reaches the menu through the bottom bar's ⋯ sheet ("Menu and settings"); a review through its ⋯ sheet
// (rev-more -> "Menu and settings"). Home has NO ☰ on #372 (A-04): the Home overlay (zIndex 500) covers the Discover
// header's ☰. #372 has no data-ct on the sheet: sheet(b) finds the fixed zIndex-1000 backdrop whose text starts
// with "Menu" and takes its first child (data-ct="menu-sheet" on #373+ is the same element).
//
// STATES:
//   home                 Home, fresh store - the ☰ question (A-04): is there a menu button on Home?
//   menu-discover        Discover -> ☰ : the sheet at its top (Account, Appearance, colour chips, 3 skins)
//   menu-puzzles         Puzzles -> ☰
//   menu-review          Review -> ☰
//   menu-play-live       Play -> Pass & Play -> ▶ Start game -> play-menu ☰ (the sheet over a live board)
//   menu-lesson          lesson demo end -> ⋯ -> "Menu and settings"
//   menu-review-more     Opera Game review at ply 10 -> ⋯ (rev-more) -> "Menu and settings" (about 60 s cold)
//   menu-bottom          menu-discover scrolled to its end (Piece style, Coach look, Share, Send feedback, footer links, Build)
//   menu-close           ... ✕ tapped: the sheet is gone, Discover is back
//   menu-backdrop-close  ... a tap on the backdrop (4,4) closes the sheet
//   menu-look            'Look and feel' (menu-look) -> the Look and feel picker (X-12): board, colours, pieces
//   menu-colour-forest   the Forest colour chip tapped in the sheet ('Board colors · Forest')
//   menu-skin-pro        the Playful (PRO) skin row tapped: the account/upgrade sheet opens on top
//   menu-celldepth-on    'Cell depth & texture' toggled ON
//   menu-evalgraph-on    'Eval graph in the player bars' (menu-evalgraph) toggled ON ('ON · try it in Review')
//   menu-readout         'Layout readout' toggled: the monospace box (screen / safe / board / mode / eval / tile ink)
//   menu-overlay-on      'Layout overlay' toggled ON ('drawn on screen') - the overlay strip (data-ct layout-grid)
//   overlay-play-live    ... then ✕ and a Pass & Play game: the overlay strip over the live board (board/sq/gap numbers)
//   menu-sound-off       'Sound' toggled OFF
//   menu-signin          'Sign in with Google' tapped (no network here): the message under the button
//   menu-share           '📣 Share Chess Trainer' tapped (clipboard fallback message)
//   feedback-home        Home 💬 -> the 'Send feedback' sheet
//   feedback-menu        menu -> '💬 Send feedback' -> the same sheet from the menu
//   feedback-typed       ... a note typed and 'Copy for Claude' pressed
//   card7                gallery card 7 (y3: the menu with Layout readout showing, the tile ink line)
'use strict';
// the menu backdrop (fixed, zIndex 1000, text starts with "Menu") and its sheet (first child). Runs in the page.
const FIND='(()=>{const bd=[...document.querySelectorAll("div")].find(d=>{const st=getComputedStyle(d);return st.position==="fixed"&&st.zIndex==="1000"&&/^Menu\\n/.test(d.innerText||"");});return bd?{bd,s:bd.firstElementChild}:null;})()';
async function sheet(b){return b.page.evaluate((F)=>{const o=eval(F);if(!o)return null;const {bd,s}=o;const r=s.getBoundingClientRect();const ps=getComputedStyle(bd);const ss=getComputedStyle(s);
  return {x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10,gapBelow:Math.round((innerHeight-r.bottom)*10)/10,gapAbove:Math.round(r.top*10)/10,sh:s.scrollHeight,ch:s.clientHeight,st:Math.round(s.scrollTop),inner:s.scrollHeight-s.clientHeight,padTop:ps.paddingTop,padBottom:ps.paddingBottom,marginTop:ss.marginTop,marginBottom:ss.marginBottom,maxHeight:ss.maxHeight,vh:innerHeight,vw:innerWidth};},FIND);}
async function hasSheet(b){return !!(await sheet(b));}
// every button / link / textarea inside the sheet with its rect (viewport coordinates; y can be off-screen)
async function rows(b){return b.page.evaluate((F)=>{const o=eval(F);if(!o)return [];return [...o.s.querySelectorAll('button,a,textarea,input')].map(x=>{const q=x.getBoundingClientRect();const st=getComputedStyle(x);return {t:(x.innerText||x.title||x.placeholder||'').replace(/\s+/g,' ').trim().slice(0,44),tag:x.tagName,x:Math.round(q.left),y:Math.round(q.top*10)/10,w:Math.round(q.width),h:Math.round(q.height*10)/10,dis:!!x.disabled,fs:st.fontSize};});},FIND);}
// the text leaves inside the sheet (section labels, the readout lines, the build line) with font sizes
async function leaves(b){return b.page.evaluate((F)=>{const o=eval(F);if(!o)return [];return [...o.s.querySelectorAll('div,span')].filter(d=>d.children.length===0&&(d.innerText||'').trim()).map(d=>{const q=d.getBoundingClientRect();const st=getComputedStyle(d);return {t:(d.innerText||'').trim().slice(0,90),y:Math.round(q.top),h:Math.round(q.height),w:Math.round(q.width),fs:st.fontSize,sw:d.scrollWidth,cw:d.clientWidth};});},FIND);}
async function scrollSheet(b,where){await b.page.evaluate(([F,w])=>{const o=eval(F);if(!o)return;o.s.scrollTop=w==='end'?o.s.scrollHeight:(typeof w==='number'?w:0);},[FIND,where]);await b.page.waitForTimeout(300);}
// the smallest visible button/link INSIDE the sheet whose text matches; scrolled into the sheet's view first
async function tapRow(b,re,wait){
  const h=await b.page.evaluateHandle(([F,src])=>{const o=eval(F);if(!o)return null;const re=new RegExp(src[0],src[1]);let best=null,ba=1e12;for(const el of o.s.querySelectorAll('button,a,[role=button]')){const t=(el.innerText||'').replace(/\s+/g,' ').trim();if(!re.test(t))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;const a=r.width*r.height;if(a<ba){ba=a;best=el;}}if(best)best.scrollIntoView({block:'center'});return best;},[FIND,[re.source,re.flags]]);
  const el=h.asElement();if(!el)throw new Error('tapRow: nothing in the sheet matches '+re);
  await b.page.waitForTimeout(200);const box=await el.boundingBox();await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(wait==null?500:wait);return box;
}
async function closeSheet(b){if(await hasSheet(b)){await tapRow(b,/^✕$/,400);}}
// the header ☰ (Discover / Puzzles / Review): title "Menu & settings"
async function tapHeaderMenu(b){const el=b.page.locator('button[title="Menu & settings"]').last();await el.waitFor({state:'visible',timeout:8000});const box=await el.boundingBox();await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(600);return box;}
async function menuBtnRects(b){return b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>/^☰$/.test((x.innerText||'').trim())||x.getAttribute('data-ct')==='play-menu'||x.getAttribute('data-ct')==='home-menu').map(x=>{const r=x.getBoundingClientRect();const vis=r.width>1&&r.height>1;const hit=vis?document.elementFromPoint(r.left+r.width/2,r.top+r.height/2):null;return {ct:x.getAttribute('data-ct')||x.title||'',x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),vis,covered:vis?!(hit===x||x.contains(hit)):null,coveredBy:hit&&!(hit===x||x.contains(hit))?(hit.tagName+'.'+(hit.getAttribute('data-ct')||(hit.innerText||'').trim().slice(0,14))):''};}));}
async function fromTile(b,tile){await b.home();await b.tile(tile);await b.settle(500);await tapHeaderMenu(b);}
// the Look and feel picker (data-ct look) and the feedback / account sheets (fixed zIndex 1100)
async function overlay1100(b,re){return b.page.evaluate((src)=>{const re=new RegExp(src);const bd=[...document.querySelectorAll('div')].find(d=>{const st=getComputedStyle(d);return st.position==='fixed'&&st.zIndex==='1100'&&re.test(d.innerText||'');});if(!bd)return null;const s=bd.firstElementChild;const r=s.getBoundingClientRect();return {x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,bottom:Math.round(r.bottom*10)/10,gapBelow:Math.round((innerHeight-r.bottom)*10)/10,sh:s.scrollHeight,ch:s.clientHeight,inner:s.scrollHeight-s.clientHeight,text:(s.innerText||'').replace(/\s+/g,' ').slice(0,400),vh:innerHeight};},re.source);}
// the layout overlay strip (data-ct layout-grid): its printed numbers
async function overlayText(b){return b.page.evaluate(()=>{const g=document.querySelector('[data-ct="layout-grid"]');if(!g)return null;const r=g.getBoundingClientRect();const txt=(g.innerText||'').replace(/\s+/g,' ').trim();const leaf=[...g.querySelectorAll('div,span')].filter(d=>d.children.length===0&&(d.innerText||'').trim()).map(d=>{const q=d.getBoundingClientRect();return {t:(d.innerText||'').trim().slice(0,80),x:Math.round(q.left),y:Math.round(q.top),w:Math.round(q.width),h:Math.round(q.height)};});return {w:Math.round(r.width),h:Math.round(r.height),text:txt.slice(0,600),leaf};});}
// the readout box text (the monospace lines) inside the sheet
async function readoutText(b){return b.page.evaluate((F)=>{const o=eval(F);if(!o)return null;const box=[...o.s.querySelectorAll('div')].find(d=>/what THIS device computes/.test(d.innerText||'')&&d.children.length>3);if(!box)return null;const r=box.getBoundingClientRect();return {text:(box.innerText||'').trim(),lines:(box.innerText||'').trim().split('\n').map(x=>x.trim()),y:Math.round(r.top),h:Math.round(r.height),w:Math.round(r.width),fs:getComputedStyle(box).fontSize,sw:box.scrollWidth,cw:box.clientWidth};},FIND);}
async function setStore(b,obj){await b.page.evaluate((o)=>{for(const k in o){if(o[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,typeof o[k]==='string'?o[k]:JSON.stringify(o[k]));}},obj);}
const S={};
S['home']=async(b)=>{await b.home();};
S['menu-discover']=async(b)=>{await fromTile(b,'Discover');};
S['menu-puzzles']=async(b)=>{await fromTile(b,'Puzzles');};
S['menu-review']=async(b)=>{await fromTile(b,'Review');};
S['menu-play-live']=async(b)=>{const P=require('./play');await P.states['pp-m0'](b);await b.tapCt('play-menu',600);};
S['menu-lesson']=async(b)=>{const D=require('./lesson');await D.states['demo-more'](b);await b.tapText(/^Menu and settings$/,{wait:600});};
S['menu-review-more']=async(b)=>{const R=require('./review');await R.states['more-sheet'](b);await b.tapText(/^Menu and settings$/,{wait:600});};
S['menu-bottom']=async(b)=>{await S['menu-discover'](b);await scrollSheet(b,'end');};
S['menu-close']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/^✕$/,500);};
S['menu-backdrop-close']=async(b)=>{await S['menu-discover'](b);await b.page.mouse.click(4,4);await b.settle(400);};
S['menu-look']=async(b)=>{await S['menu-discover'](b);await b.tapCt('menu-look',700);};
S['menu-colour-forest']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/^Forest$/,400);};
S['menu-skin-pro']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/^🔭♟️ Playful/,600);};
S['menu-celldepth-on']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/^Cell depth & texture/,400);};
S['menu-evalgraph-on']=async(b)=>{await S['menu-discover'](b);await b.page.evaluate(()=>{const e=document.querySelector('[data-ct="menu-evalgraph"]');if(e)e.scrollIntoView({block:'center'});});await b.settle(200);await b.tapCt('menu-evalgraph',400);};
S['menu-readout']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/^Layout readout/,500);await b.page.evaluate((F)=>{const o=eval(F);const box=[...o.s.querySelectorAll('div')].find(d=>/what THIS device computes/.test(d.innerText||'')&&d.children.length>3);if(box)box.scrollIntoView({block:'center'});},FIND);await b.settle(200);};
S['menu-overlay-on']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/^Layout overlay/,500);};
S['overlay-play-live']=async(b)=>{await S['menu-overlay-on'](b);await tapRow(b,/^✕$/,400);const P=require('./play');await P.states['pp-m0'](b);await b.settle(400);};
S['menu-sound-off']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/^Sound/,400);};
S['menu-signin']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/Sign in with Google|Sign-in unavailable/,1500);};
S['menu-share']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/^📣 Share/,900);};
S['feedback-home']=async(b)=>{await b.home();await b.tapText(/^💬$/,{wait:600});};
S['feedback-menu']=async(b)=>{await S['menu-discover'](b);await tapRow(b,/^💬 Send feedback$/,600);};
S['feedback-typed']=async(b)=>{await S['feedback-home'](b);await b.page.locator('textarea[placeholder="Your feedback..."]').fill('audit note');await b.tapText(/^Copy for Claude$/,{wait:700});};
S['card7']=async(b)=>{await b.card(7,2500);};

module.exports={states:S,sheet,hasSheet,rows,leaves,scrollSheet,tapRow,closeSheet,tapHeaderMenu,menuBtnRects,fromTile,overlay1100,overlayText,readoutText,setStore,FIND,
  notes:'The menu is a fixed backdrop (zIndex 1000, padding max(10px,safe) 12px) with a scrolling sheet inside (on #372: margin-top 5vh, max-height 88vh, margin-bottom 24px; on #373 the sheet takes the padded viewport). Entries: the header ☰ of Discover/Puzzles/Review (title "Menu & settings"), data-ct play-menu in a live game, "Menu and settings" in the lesson ⋯ sheet and the review ⋯ sheet. Home has no ☰ on #372. The sheet: Account (Sign in with Google), Appearance (menu-look, 12 colour chips, SKIN x3, Cell depth, Evaluation bar, Eval bar sits, menu-evalgraph, Layout readout, Layout overlay, Sound, Piece style x5, Coach look x4), Share, Send feedback, Privacy/Terms/Refunds/Delete account, Build line. The Look and feel picker (data-ct look), the feedback sheet and the account sheet are fixed zIndex-1100 overlays. The layout overlay is data-ct layout-grid (fixed, pointer-events none) and persists in ct_layoutgrid.'};
