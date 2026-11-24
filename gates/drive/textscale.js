'use strict';
// gates/drive/textscale.js - A LARGER-TEXT INPUT FOR THE HARNESS (batch 14, jobs/the-suite-varies-seven-geometries-and-exactly-one-font-so-no-gate-covers-a-larger-accessibility-font-2026-10-06).
// WHY THIS AND NOT A ROOT FONT-SIZE, said once because the job's own record made the point: the app sizes text in px (212 bare numeric fontSize values,
// 4 explicit px, 14 em, 0 rem), so html{font-size:120%}, a minimum-font setting or a page zoom leaves almost every glyph unchanged or scales the layout
// with it. iOS Larger Text scales TEXT and leaves the layout's own boxes alone. This installs the closest honest thing a headless page can do: every
// element that owns a text node has its computed font-size (and its px line-height, when it has one) multiplied by S, set with !important, from the
// FIRST paint and again whenever React re-renders (a MutationObserver plus a 150 ms sweep), remembering each element's own original size so repeated
// sweeps never compound. Boxes with a fixed px height keep it, as they do on a phone, so a clipped label stays clipped: that is the point of the input.
// PROVE IT MOVES THE QUANTITY before you read an assertion under it (CLAUDE.md, #416): textScaleStats(b) returns how many elements were scaled and
// their summed text height; a gate prints it beside the board it measures and asserts it grew.
// Usage: const TS=require('../drive/textscale'); const b=await L.launch({...}); await TS.install(b,1.3); await b.open();
const SCRIPT=`(()=>{const S=__S__;if(!(S>0)||window.__ctTS)return;
 const orig=new WeakMap();let n=0;
 const own=(el)=>{for(const c of el.childNodes)if(c.nodeType===3&&c.nodeValue.trim())return true;return false;};
 const sweep=()=>{const root=document.getElementById('root')||document.body;if(!root)return;n=0;
  for(const el of root.querySelectorAll('*')){if(!own(el))continue;
   let o=orig.get(el);if(!o){const cs=getComputedStyle(el);const fs=parseFloat(cs.fontSize),lh=/px$/.test(cs.lineHeight)?parseFloat(cs.lineHeight):0;if(!(fs>0))continue;o={fs,lh};orig.set(el,o);}
   el.style.setProperty('font-size',(o.fs*S)+'px','important');if(o.lh)el.style.setProperty('line-height',(o.lh*S)+'px','important');n++;}
  window.__ctTSn=n;};
 window.__ctTS=S;const q=()=>{if(window.__ctTSq)return;window.__ctTSq=requestAnimationFrame(()=>{window.__ctTSq=0;sweep();});};
 const go=()=>{const root=document.getElementById('root');if(!root){setTimeout(go,30);return;}new MutationObserver(q).observe(root,{subtree:true,childList:true,characterData:true});setInterval(sweep,150);sweep();};
 go();})()`;
async function install(b,S){await b.page.addInitScript(SCRIPT.replace('__S__',String(Number(S))));}
// how many elements carry the scale now, and the summed height of the boxes that own text (the chrome's text-driven height)
function stats(b){return b.page.evaluate(()=>{let h=0,n=0;for(const el of document.querySelectorAll('#root *')){let own=false;for(const c of el.childNodes)if(c.nodeType===3&&c.nodeValue.trim()){own=true;break;}if(!own)continue;const r=el.getBoundingClientRect();if(r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight){h+=r.height;n++;}}
  return {scale:window.__ctTS||1,scaled:window.__ctTSn||0,textBoxes:n,textHeight:Math.round(h*10)/10};});}
module.exports={install,stats};
