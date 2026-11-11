'use strict';
// gates/regress/108-medieval-discover-icons.js - THE MEDIEVAL SKIN DRAWS ITS OWN DISCOVER ICONS; THE OTHER SKINS KEEP TODAY'S. TC-LS-061a..c, US-LS-15.
//
// WHY [#550 answer a22; jobs/discover-tile-icons-should-match-each-theme-2026-11-11; Kunal's pick in chat, about 9:55am EST Wed 11 Nov
// 2026, "round 2 option B, painted shields on banner cloth", and the orchestrator's a22 at 11:18am ET: "Build the Medieval set now
// (medieval-b in docs/icons-discover-2026-11-11); Playful keeps today's icons. CLASSIC IS ON HOLD AGAIN"].
//
// WHAT IT ASSERTS, at kunal761 and se, Discover's four tiles (Openings, Gambits, Endgames, Tactics):
//  (a) TC-LS-061a in the MEDIEVAL skin (ct_skin 2, Pro on) every tile draws the medieval-b SVG (an svg element inside the tile, painted:
//      width and height above 40px, and square within 1px) and no emoji glyph.
//  (b) TC-LS-061b in the CLASSIC skin and (c) TC-LS-061c the PLAYFUL skin every tile keeps today's emoji (🚀 ⚔️ 👑 💡) and no svg.
// DENOMINATOR per skin: the four tiles were found by their labels.
// CONTROL-RECORD: 0f43541 2026-11-11 total=19 red=2 scope=trial:d36f303f3bef how=#550 answer a22: the tree before the Medieval set - in the Medieval skin every Discover tile still shows its emoji, so both TC-LS-061a lines are red at kunal761 and se; the Classic and Playful lines, the six DENOMINATORS and zero-errors green; the a22 trial 1c33f2431db8 reads 19 pass, 0 fail
const L=require('../lib');const D=require('../drive/lesson');
const EMOJI=['🚀','⚔️','👑','💡'],LABELS=['Openings','Gambits','Endgames','Tactics'];
const read=(b)=>b.page.evaluate((LABELS)=>{const out=[];for(const lab of LABELS){const btn=[...document.querySelectorAll('button')].find(x=>(x.innerText||'').split('\n').map(t=>t.trim()).includes(lab));if(!btn){out.push(null);continue;}
  const tile=btn.firstElementChild;const svg=tile&&tile.querySelector('svg');const r=svg?svg.getBoundingClientRect():null;
  out.push({lab,svg:!!svg,w:r?Math.round(r.width*10)/10:0,h:r?Math.round(r.height*10)/10:0,txt:tile?(tile.innerText||'').trim():''});}return out;},LABELS);
L.run(async()=>{
  for(const geo of ['kunal761','se']){
    for(const [id,skin,name] of [['TC-LS-061a','2','Medieval'],['TC-LS-061b','1','Classic'],['TC-LS-061c','0','Playful']]){
      const b=await L.launch({geo,name:'disc-'+name+'-'+geo,store:{ct_pro:'1',ct_skin:skin}});await b.open();
      let ok=true;try{await D.states['discover'](b);await b.settle(1200);}catch(e){ok=false;}
      const t=ok?await read(b):[];
      L.say(t.length===4&&t.every(Boolean),geo+' '+name+': '+id+' DENOMINATOR the four Discover tiles were found by their labels',t);
      if(t.length===4&&t.every(Boolean)){
        if(skin==='2')L.say(t.every(x=>x.svg&&x.w>40&&x.h>40&&Math.abs(x.w-x.h)<=1&&!EMOJI.some(e=>x.txt.includes(e))),geo+' '+name+': '+id+' every tile draws the medieval-b SVG, painted and square ('+t.map(x=>x.lab+' '+x.w+'x'+x.h).join(', ')+'), and no emoji',t);
        else L.say(t.every((x,i)=>!x.svg&&x.txt.includes(EMOJI[i])),geo+' '+name+': '+id+' every tile keeps today\'s emoji ('+t.map(x=>x.txt).join(' ')+') and no SVG',t);
      }
      L.say(b.errs.length===0,geo+' '+name+': zero app errors',b.errs.slice(0,3));
      await b.close();
    }
  }
},'108-medieval-discover-icons');
