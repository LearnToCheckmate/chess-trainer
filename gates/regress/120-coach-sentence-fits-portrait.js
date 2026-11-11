'use strict';
// gates/regress/120-coach-sentence-fits-portrait.js - TC-R118 (US-R03 clause), THE COACH SENTENCE FITS ITS BOX AT EVERY PLY, 375 WIDE.
//
// WHY [#550 round-4 suite]: TC-R118 was block U of gates/regress/22-engline-recovery.js (#550 item (55), jobs/the-coach-sentence-is-
// rewritten-two-seconds-in-and-portrait-headroom-is-now-0-3px-2026-10-10). Four geometries x 85 plies settled 1.5 s each, plus an import
// per geometry, put gate 22 past the suite's 900 s per-gate ceiling: it TIMED OUT in the round-3 and round-4 suites (115 PASS lines, then
// killed), while run alone on t68 it read 121 of 121. The block is unchanged; it is split two geometries per gate so each fits the ceiling.
// Its control record moved with it (the a30a884 control, scope blocks:U, narrowed by CT_U_GEOS to the geometries it reddened).
const L=require('../lib');
L.run(async()=>{
  /* ── TC-R118, BLOCK U: THE COACH SENTENCE FITS ITS BOX AT EVERY PLY, WITH NO CLAMP DOING THE FITTING (#550 item (55)) ─────────────
     jobs/the-coach-sentence-is-rewritten-two-seconds-in-and-portrait-headroom-is-now-0-3px-2026-10-10: the tallest sentence of
     Kunal's game measured 50.7px in a 51px box at 375x761, 0.3px of headroom, and no assertion held it. At every ply of his game
     (85 plies) at 375x761 with his insets, 375x730, 320x568 and 761x375 (the R19 portrait turned to landscape), engine line off: settle 1.5 s past the
     landing (the refutation is debounced, TC-R117), then switch rev-why-txt's line clamp off IN PLACE, read its scrollHeight against
     the box's clientHeight, and put the clamp back. In place, not on a clone (CLAUDE.md: a clone read a resolved track 2px under).
     Denominator per geometry: plies measured, and the tallest sentence printed with its ply, so the 0.3px is visible every run. */
  {const KPGN=require('fs').readFileSync(__dirname+'/../../claude/agents/bench/pgn/184024052818.pgn','utf8');
   const fit=(bb)=>bb.page.evaluate(()=>{const e=document.querySelector('[data-ct="rev-why-txt"]');if(!e)return null;const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return null;
     // FRACTIONAL, not scrollHeight: scrollHeight is an integer, so a 50.7px sentence and a 51.4px one both read 51 in a 51 box.
     // The box's own height first, then the clamp, the fixed height and any max lifted IN PLACE, the rect read, and all three put back.
     const ch=Math.round(r.height*100)/100,lc=e.style.webkitLineClamp,hh=e.style.height,mh=e.style.maxHeight;
     e.style.webkitLineClamp='none';e.style.height='auto';e.style.maxHeight='none';const sh=Math.round(e.getBoundingClientRect().height*100)/100;
     e.style.webkitLineClamp=lc;e.style.height=hh;e.style.maxHeight=mh;
     const st=getComputedStyle(e),lines=parseInt(st.webkitLineClamp,10),lh=parseFloat(st.lineHeight);
     return {ch,sh,clamp:isNaN(lines)?null:lines,lh:Math.round(lh*100)/100,txt:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,60)};});
   const UGEOS=[['375x761',{geo:'kunal761'}],['375x730',{geo:'kunal730'}],['320x568',{geo:'se'}],['761x375 landscape',{geo:{w:761,h:375,safe:''}}]];
   const ONLY=['375x761', '375x730'];   // #550: block U split across gates 120 and 121 - this file's two geometries
   // CT_U_GEOS narrows block U to named columns (a comma list of their leading dimensions); the run SAYS it is narrowed. gates.sh never sets it.
   const UG0=UGEOS.filter(([n])=>ONLY.indexOf(n)>=0);
   const UG=process.env.CT_U_GEOS?UG0.filter(([n])=>process.env.CT_U_GEOS.split(',').some(x=>n.indexOf(x)===0)):UG0;
   if(process.env.CT_U_GEOS)L.note('TC-R118 block U NARROWED by CT_U_GEOS='+process.env.CT_U_GEOS+' to '+UG.map(x=>x[0]).join(', ')+' - not the full sweep');
   for(const [name,geo] of UG){
     const b=await L.launch(Object.assign({store:{ct_pool:'3'},name:'coach-fits-'+name.slice(0,7)},geo));await b.open();let ok=true;
     // the review driver's import, not the tile-and-textarea route block T uses: that route did not reach the summary at 761x375 (0 of 85 plies)
     const RV=require('../drive/review');
     try{await RV.importPgn(b,KPGN,240000);await RV.startReview(b);}catch(e){ok=false;}
     const rows=[];
     if(ok){for(let T=1;T<=85;T++){try{await RV.goPly(b,T);await b.page.waitForTimeout(1500);const m=await fit(b);if(m)rows.push(Object.assign({ply:T},m));}catch(e){break;}}}
     const over=rows.filter(r=>r.sh>r.ch+0.05);const top=rows.slice().sort((x,y)=>(y.sh-y.ch)-(x.sh-x.ch))[0]||null;
     L.say(ok&&rows.length>=80,'TC-R118 '+name+': DENOMINATOR the coach sentence was measured at '+rows.length+' of 85 plies of Kunal\'s game (at least 80)',{n:rows.length});
     /* the FULL fit is the 375-wide portrait promise; at 320x568 and in landscape (a 34px two-line box, measured 56.53 at ply 1 on t10) the
        whole sentence does not fit by design and the CLAMP must do the cutting, which the else-branch asserts */
     if(/^375x/.test(name)){
       L.say(ok&&rows.length>=80&&over.length===0,'TC-R118 '+name+': at every ply the sentence\'s unclamped height fits its box (tightest: ply '+(top&&top.ply)+', '+(top&&top.sh)+' in '+(top&&top.ch)+')',{over:over.slice(0,4),tightest:top});
     }else{
       /* AT 320x568 (AND IN LANDSCAPE) THE WHOLE SENTENCE DOES NOT FIT BY DESIGN (measured on trial t10: 67.56 in 51 at ply 17, four lines in a three-line box), and
          #387's rule is that the CLAMP must be what truncates - an ellipsis the player sees - never the box's overflow:hidden. So here the
          assertion is that rule, CLAUDE.md's "a clamp and a clip are two different boxes": wherever the sentence is cut, a line clamp is set,
          and the box is no taller than the lines that clamp allows (so no fourth line paints decapitated into slack). The count prints. */
       const cut=rows.filter(r=>r.sh>r.ch+0.05),bad=cut.filter(r=>!(r.clamp>0)||r.ch>Math.ceil(r.clamp*r.lh)+0.5);
       L.say(ok&&rows.length>=80&&bad.length===0,'TC-R118 '+name+': the sentence is cut at '+cut.length+' of '+rows.length+' plies, and at every one the line clamp does the cutting: a clamp is set and the box is no taller than the clamped lines',{bad:bad.slice(0,4),cutPlies:cut.map(r=>r.ply).slice(0,20)});
     }
     await b.close();}
  }
},'120-coach-sentence-fits-portrait');
