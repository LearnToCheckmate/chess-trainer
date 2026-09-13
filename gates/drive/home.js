// gates/drive/home.js - drives the Home overlay and the Discover screen on the bundle under test. Every state
// function takes a launched+opened `b` from gates/lib.js and puts the app into that state from wherever it is.
// Each state starts from a FRESH store for the keys that change what Home shows (ct_lastlesson turns the Daily 3
// lesson dot into 'Continue: …', ct_daily3 decides where the card goes, the puzzle progress hides the NEW HERE
// card), so the states are deterministic and the regression suite can call any one of them on its own.
//
//   const H=require('./drive/home');  await H.states['home-bottom'](b);  const o=await H.overlay(b);
//
// HOME IS A FIXED OVERLAY (position fixed, inset 0, zIndex 500, overflowY auto) drawn over the Discover screen:
// lib's over() skips fixed children, so the overflow of Home is overlay.sh - overlay.ch (H.overlay) and its
// scroll is overlay.scrollTop, not the document's. The 🎬 and 💬 buttons are fixed (zIndex 9997) and exist only
// while the overlay is up; the 👋 (Sign in) is fixed in the overlay's top-right. On #372 Home has no ☰ - the ☰ in
// the DOM is the Discover header under the overlay (A-04).
//
// STATES:
//   home                  fresh store, the overlay scrolled to the top (Daily 3, NEW HERE, four tiles, the 🎓 coach line at the fold)
//   home-bottom           the overlay scrolled to its end (coach line, Colours & pieces, Style, the Build line, the 🎬/💬 over them)
//   home-wave             👋 tapped: the Sign in / account sheet
//   home-gallery          🎬 tapped: the Preview gallery (dev)
//   home-feedback         💬 tapped: the feedback sheet
//   home-daily3-fresh     Daily 3 tapped with nothing done and no last lesson (it goes to Discover)
//   home-daily3-lesson    Daily 3 with today's lesson done (ct_daily3 lesson:1): it goes to the puzzle roadmap
//   home-daily3-continue  Daily 3 with a last lesson (ct_lastlesson 0): the dot reads 'Continue: …' and it opens that lesson
//   home-newhere          NEW HERE? START HERE tapped: the first opening lesson
//   home-coachline        the 🎓 coach line tapped ('open'): the recommended lesson
//   home-look             Colours & pieces tapped: the Look and feel picker (data-ct look)
//   home-look-chip        … then colour chip look-th-3 tapped (the preview board recolours)
//   home-look-piece       … then the second piece chip tapped
//   home-style            Style: Classic 🔒 tapped (not Pro: the account sheet with the upgrade message)
//   discover              the Discover tile: What do you want to learn? + four group cards + tab bar
//   discover-menu         ☰ on Discover: the menu sheet
//   discover-openings     🚀 Openings: the list, scrolled to the top
//   discover-openings-end … scrolled to the end
//   discover-gambits      ⚔️ Gambits list
//   discover-gambits-end  … scrolled to the end
//   discover-endgames     👑 Endgames list
//   discover-endgames-end … scrolled to the end
//   discover-tactics      💡 Tactics (the trainer)
//   discover-back         ‹ Back from the Openings list
'use strict';
const KEYS=['ct_lastlesson','ct_daily3','ct_daily','chesstrainer.progress.v1','ct_train','ct_learnprog','ct_coachtier','ct_streakdismiss'];
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

async function setStore(b,obj){await b.page.evaluate((o)=>{for(const k in o){if(o[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,typeof o[k]==='string'?o[k]:JSON.stringify(o[k]));}},obj);await b.open();}
// a fresh Home: none of the keys that change the card set; reloads only when something is set
async function fresh(b,extra){const want=Object.assign(Object.fromEntries(KEYS.map(k=>[k,null])),extra||{});
  const dirty=await b.page.evaluate((w)=>Object.keys(w).some(k=>{const v=localStorage.getItem(k);const e=w[k]==null?null:(typeof w[k]==='string'?w[k]:JSON.stringify(w[k]));return v!==e;}),want);
  if(dirty)await setStore(b,want);await b.home();await scrollHome(b,'top');}

// the Home overlay (fixed, zIndex 500): its scroll box numbers
async function overlay(b){return b.page.evaluate(()=>{const h=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');if(!h)return null;const r=h.getBoundingClientRect();return {sh:h.scrollHeight,ch:h.clientHeight,st:h.scrollTop,over:h.scrollHeight-h.clientHeight,x:r.left,y:r.top,w:r.width,h:r.height};});}
async function scrollHome(b,where){await b.page.evaluate((w)=>{const h=[...document.querySelectorAll('div')].find(d=>d.style.position==='fixed'&&d.style.zIndex==='500');if(h)h.scrollTop=w==='end'?h.scrollHeight:0;},where);await b.settle(250);}
// any scroll box on screen (the Discover lists scroll the document or a container): {doc:{sh,ch,st},boxes:[...]}
async function scrollBox(b){return b.page.evaluate(()=>{const de=document.scrollingElement||document.documentElement;const boxes=[...document.querySelectorAll('div')].filter(el=>{const st=getComputedStyle(el);return (st.overflowY==='auto'||st.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+1;}).map(el=>{const r=el.getBoundingClientRect();return {pos:getComputedStyle(el).position,sh:el.scrollHeight,ch:el.clientHeight,st:el.scrollTop,top:Math.round(r.top),h:Math.round(r.height)};});return {doc:{sh:de.scrollHeight,ch:de.clientHeight,st:de.scrollTop},boxes};});}
async function scrollTo(b,where){await b.page.evaluate((w)=>{const de=document.scrollingElement||document.documentElement;const boxes=[...document.querySelectorAll('div')].filter(el=>{const st=getComputedStyle(el);return (st.overflowY==='auto'||st.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+1;});for(const el of boxes)el.scrollTop=w==='end'?el.scrollHeight:0;de.scrollTop=w==='end'?de.scrollHeight:0;window.scrollTo(0,w==='end'?de.scrollHeight:0);},where);await b.settle(300);}

// the smallest visible BUTTON whose text matches (scrolled into view first)
async function tapBtn(b,re,wait){
  const h=await b.page.evaluateHandle((src)=>{const re=new RegExp(src[0],src[1]);let best=null,ba=1e12;for(const el of document.querySelectorAll('button')){const t=(el.innerText||'').replace(/\s+/g,' ').trim();if(!re.test(t))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;const a=r.width*r.height;if(a<ba){ba=a;best=el;}}if(best)best.scrollIntoView({block:'center',inline:'center'});return best;},[re.source,re.flags]);
  const el=h.asElement();if(!el)throw new Error('tapBtn: no button matches '+re);
  await b.page.waitForTimeout(150);const box=await el.boundingBox();
  await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(wait==null?500:wait);return box;
}
async function tapTitle(b,title,wait){const el=b.page.locator('button[title="'+title+'"]').last();await el.waitFor({state:'visible',timeout:8000});const box=await el.boundingBox();await b.page.mouse.click(box.x+box.width/2,box.y+box.height/2);await b.page.waitForTimeout(wait==null?500:wait);return box;}
// visible buttons with rects (viewport coordinates)
async function btnRects(b){return b.page.evaluate(()=>[...document.querySelectorAll('button')].filter(x=>{const r=x.getBoundingClientRect();return r.width>1&&r.height>1&&r.bottom>0&&r.top<innerHeight;}).map(x=>{const r=x.getBoundingClientRect();const st=getComputedStyle(x);return {t:(x.innerText||x.getAttribute('aria-label')||x.title||'').replace(/\s+/g,' ').trim().slice(0,48),title:x.title||'',x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,fixed:st.position==='fixed',z:st.zIndex,dis:x.disabled};}));}
// every leaf text node on screen with its font size and rect (for the 8-11px hunt and clipping checks)
async function textNodes(b,minFs){return b.page.evaluate((mf)=>{const out=[];const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=walk.nextNode())){const t=(n.textContent||'').replace(/\s+/g,' ').trim();if(!t)continue;const el=n.parentElement;if(!el)continue;const st=getComputedStyle(el);if(st.visibility==='hidden'||st.display==='none')continue;const rg=document.createRange();rg.selectNodeContents(n);const r=rg.getBoundingClientRect();if(r.width<1||r.height<1)continue;if(r.bottom<0||r.top>innerHeight)continue;const fs=parseFloat(st.fontSize);if(mf!=null&&fs>=mf)continue;
  // is it under an opaque fixed overlay? (the Home overlay hides the Discover header) - check the top element at its centre
  const top=document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),Math.min(innerHeight-1,Math.max(0,r.top+r.height/2)));const visible=!!top&&(top===el||el.contains(top)||top.contains(el));
  out.push({t:t.slice(0,44),fs:Math.round(fs*10)/10,x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,right:Math.round(r.right*10)/10,bottom:Math.round(r.bottom*10)/10,visible,clipped:el.scrollWidth>el.clientWidth+1&&st.overflow!=='visible'});}
  return out;},minFs==null?null:minFs);}

const S={};
S['home']=async(b)=>{await fresh(b);};
S['home-bottom']=async(b)=>{await fresh(b);await scrollHome(b,'end');};
S['home-wave']=async(b)=>{await fresh(b);await tapTitle(b,'Sign in',600);};
S['home-gallery']=async(b)=>{await fresh(b);await tapTitle(b,'Preview gallery (dev)',600);};
S['home-feedback']=async(b)=>{await fresh(b);await tapTitle(b,'Send feedback to Claude',600);};
S['home-daily3-fresh']=async(b)=>{await fresh(b);await tapBtn(b,/^Daily 3 /,800);};
S['home-daily3-lesson']=async(b)=>{await fresh(b,{ct_daily3:{date:today(),lesson:1,puz:0}});await tapBtn(b,/^Daily 3 /,800);};
S['home-daily3-continue']=async(b)=>{await fresh(b,{ct_lastlesson:'0'});await tapBtn(b,/^Daily 3 /,1200);};
S['home-newhere']=async(b)=>{await fresh(b);await tapBtn(b,/^NEW HERE\? START HERE /,1200);};
S['home-coachline']=async(b)=>{await fresh(b);await tapBtn(b,/^🎓 .* open$/,1200);};
S['home-look']=async(b)=>{await fresh(b);await b.tapCt('home-look',600);};
S['home-look-chip']=async(b)=>{await S['home-look'](b);await b.tapCt('look-th-3',500);};
S['home-look-piece']=async(b)=>{await S['home-look'](b);const id=await b.page.evaluate(()=>{const c=document.querySelectorAll('[data-ct="look-pieces"] button');return c[1]?c[1].getAttribute('data-ct'):null;});if(!id)throw new Error('no second piece chip');await b.tapCt(id,500);};
S['home-style']=async(b)=>{await fresh(b);await tapBtn(b,/^A Style: /,600);};
S['discover']=async(b)=>{await fresh(b);await b.tile('Discover');await b.settle(500);await scrollTo(b,'top');};
S['discover-menu']=async(b)=>{await S['discover'](b);await tapBtn(b,/^☰$/,600);};
const group=(re)=>async(b)=>{await S['discover'](b);await tapBtn(b,re,700);await scrollTo(b,'top');};
S['discover-openings']=group(/^🚀 Openings /);
S['discover-openings-end']=async(b)=>{await S['discover-openings'](b);await scrollTo(b,'end');};
S['discover-gambits']=group(/^⚔️ Gambits /);
S['discover-gambits-end']=async(b)=>{await S['discover-gambits'](b);await scrollTo(b,'end');};
S['discover-endgames']=group(/^👑 Endgames /);
S['discover-endgames-end']=async(b)=>{await S['discover-endgames'](b);await scrollTo(b,'end');};
S['discover-tactics']=group(/^💡 Tactics /);
S['discover-back']=async(b)=>{await S['discover-openings'](b);await tapBtn(b,/^‹ Back$/,600);};

module.exports={states:S,fresh,setStore,overlay,scrollHome,scrollBox,scrollTo,tapBtn,tapTitle,btnRects,textNodes,today,
  notes:'Home is a fixed overlay (zIndex 500, overflowY auto) over Discover: measure its scroll with overlay(b), not lib over(). '+
        'The 🎬/💬 buttons are fixed zIndex 9997 and exist only while Home is up; 👋 is button[title="Sign in"]. Discover is reached by the Discover tile; '+
        'its lists scroll the document (scrollBox/scrollTo). States reset ct_lastlesson/ct_daily3/puzzle progress so the card set is deterministic.'};
