'use strict';
// gates/regress/204-primary-blue-white-on-deeper-blue.js - THE PRIMARY BLUE BUTTONS ARE WHITE ON #2B65A8, IN ONE SHARED STYLE, AND NOTHING ELSE CHANGED.
// US-R214 / TC-R308..R309. Job: jobs/primary-blue-buttons-get-white-text-on-a-deeper-blue-2026-11-15 (Kunal's pick, option D: "white text on a deep
// blue", decisions/primary-blue-buttons-use-white-text-on-a-deeper-blue-2026-11-15). The fill is the theme's own `fill` (Ocean: #2b65a8, the default
// blue theme, whose accent #5b9bd5 stays the ACCENT for every border, tick and highlight); every primary button paints var(--acf) and takes its ink
// from var(--acInk), which is white where the fill is dark enough. The other eleven themes have no `fill`, so their fill is their accent and their ink
// is the dark ink A11Y-02 chose: this gate holds them still.
// WHAT IT MEASURES, in the bundle under test (CT_APP), at kunal761 and 320x568, on the Review list (Analyze game and Fetch, the two buttons the job names):
//   TC-R308 a  Ocean: the two buttons exist, their fill is rgb(43,101,168) and their ink rgb(255,255,255) with the faint shadow (0 1px 1px, black 25%)
//   TC-R308 b  their text contrast, composited through the button's own gradient (white 20% at the top to black 10% at the bottom) and read at the
//              glyph box's top, middle and bottom rows by gates/regress/144's compositor, is at least 4.5 (the job asks top and middle)
//   TC-R308 c  no visible button still paints the OLD light blue rgb(91,155,213) as its fill: the migration is complete on this screen
//   TC-R309 a  every other theme: its accent buttons keep the accent as the fill and the dark ink rgb(11,13,16), no shadow
//   TC-R309 b  Ocean's other buttons (no accent fill) carry no text shadow and keep their own ink: the shadow is for the primary only
const L=require('../lib');
const fs=require('fs'),path=require('path');
const APP=process.env.CT_APP||path.join(__dirname,'..','..','app.js');
const SRC=fs.readFileSync(APP,'utf8');
const TH=[...SRC.matchAll(/name:"([^"]+)",light:"#[0-9a-fA-F]{6}",dark:"#[0-9a-fA-F]{6}",bg:"#[0-9a-fA-F]{6}",glow:"[^"]*",accent:"(#[0-9a-fA-F]{6})",(?:fill:"(#[0-9a-fA-F]{6})",)?/g)].map(m=>({name:m[1],accent:m[2],fill:m[3]||null}));
const rgb=(h)=>{const x=h.replace('#','');return 'rgb('+[0,2,4].map(i=>parseInt(x.slice(i,i+2),16)).join(', ')+')';};
// 144's compositor (the whole stack under the text, three rows), reused rather than copied: the template is read out of that gate's source
const src144=fs.readFileSync(path.join(__dirname,'144-readable-everywhere.js'),'utf8');
const COMP=new Function('return `'+/const COMP=`([\s\S]*?)`;\n/.exec(src144)[1]+'`')();
const AA=4.5;
const READ=`(()=>{const out=[];for(const x of document.querySelectorAll('button')){const r=x.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<=0||r.top>=innerHeight)continue;
  const cs=getComputedStyle(x);out.push({ct:x.getAttribute('data-ct')||'',text:(x.innerText||x.getAttribute('aria-label')||'').trim().slice(0,24),bg:cs.backgroundColor,ink:cs.color,sh:cs.textShadow,m:window.__ctCR?window.__ctCR(x):null});}return out;})()`;
async function onReview(b,theme){await b.page.evaluate((t)=>{localStorage.setItem('ct_theme',String(t));},theme);await b.page.reload({waitUntil:'domcontentloaded'});await b.settle(1500);
  await b.page.evaluate(COMP);await b.tile('Review');await b.settle(700);await b.page.evaluate(COMP);return b.page.evaluate(READ);}
L.run(async()=>{
  const OC=TH.findIndex(t=>t.name==='Ocean');
  L.say(TH.length>=12&&OC>=0&&TH[OC].fill==='#2b65a8'&&TH[OC].accent==='#5b9bd5','TC-R308 PRECONDITION the bundle names '+TH.length+' themes and Ocean carries fill #2b65a8 beside its accent #5b9bd5',TH[OC]);
  for(const geo of ['kunal761','se']){
    const b=await L.launch({geo,name:'pb204-'+geo,pro:true});await b.open();await b.settle(800);
    const oc=await onReview(b,OC);
    const fills=oc.filter(x=>x.bg==='rgb(43, 101, 168)');
    const an=fills.find(x=>x.ct==='paste-analyze'),fe=fills.find(x=>x.ct==='import-fetch');
    L.say(!!an&&!!fe,'TC-R308a PRECONDITION '+geo+' Ocean: Analyze game and Fetch are on the Review list with the fill rgb(43, 101, 168) ('+fills.length+' buttons paint it)',oc.map(x=>x.ct+' '+x.bg));
    for(const x of [an,fe]){if(!x)continue;
      L.say(x.ink==='rgb(255, 255, 255)'&&/rgba\(0, 0, 0, 0\.25\) 0px 1px 1px/.test(x.sh),'TC-R308a '+geo+' '+x.ct+': ink white with the faint shadow ('+x.ink+' / '+x.sh+')',x);
      L.say(!!x.m&&x.m.ratio>=AA,'TC-R308b '+geo+' '+x.ct+': text contrast through its own gradient is at least '+AA+' ('+(x.m&&x.m.ratio)+':1 '+(x.m&&(x.m.ink+' on '+x.m.bg))+')',x.m);}
    const old=oc.filter(x=>x.bg==='rgb(91, 155, 213)');
    L.say(old.length===0,'TC-R308c '+geo+' no visible button still paints the old light blue fill ('+old.length+' do)',old.map(x=>x.ct+' '+x.text));
    const others=oc.filter(x=>x.bg!=='rgb(43, 101, 168)');
    L.say(others.length>=3&&others.every(x=>x.sh==='none'),'TC-R309b '+geo+' Ocean: the '+others.length+' other visible buttons carry no text shadow',others.map(x=>x.ct+':'+x.sh));
    L.say(b.errs.length===0,'TC-R308 '+geo+' zero app errors',b.errs.slice(0,3));await b.close();
  }
  {const b=await L.launch({geo:'kunal761',name:'pb204-themes',pro:true});await b.open();await b.settle(800);let seen=0;
   for(let t=0;t<TH.length;t++){if(t===OC)continue;const r=await onReview(b,t);const f=r.filter(x=>x.bg===rgb(TH[t].accent));seen+=f.length;
     L.say(f.length>=2&&f.every(x=>x.ink==='rgb(11, 13, 16)'&&x.sh==='none'),'TC-R309a theme '+t+' '+TH[t].name+': '+f.length+' accent-filled buttons keep fill '+TH[t].accent+' and the dark ink, no shadow',f.map(x=>x.ct+' '+x.ink+' '+x.sh));}
   L.say(seen>=2*(TH.length-1),'TC-R309a DENOMINATOR '+seen+' accent-filled buttons over '+(TH.length-1)+' other themes (at least 2 each)');await b.close();}
},'204-primary-blue-white-on-deeper-blue');
