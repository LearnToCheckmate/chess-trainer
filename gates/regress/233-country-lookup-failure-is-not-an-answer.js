'use strict';
// gates/regress/233-country-lookup-failure-is-not-an-answer.js - A REFUSED COUNTRY LOOKUP IS NOT STORED AS THE ANSWER, IS ASKED AGAIN NEXT
// TIME, AND A KNOWN COUNTRY PAINTS ITS FLAG BEFORE THE NAME. TC-R396, TC-R397; US-R01 (the best-effort side lookup clause).
//
// WHY [#553 B3, jobs/a-failed-country-lookup-is-cached-as-an-answer-so-one-offline-review-removes-the-flag-for-ever-2026-10-10]. The fix
// landed at #547/#548 (fetchCountry caches only a response it read, or a 404) and gate 20 holds TC-R68/TC-R68b/TC-R107 - at 375x730 only,
// the superseded column, inside its long TC-R12b session, and without asking whether the lookup was ever SENT. The orchestrator's check of
// 15 Nov named both limits: Kunal's phone was covered by a probe, not by a gate, and a cache that is empty because nobody asked is the same
// reading as a cache that is empty because the failure was not stored. This gate runs the job's whole case at one geometry chosen by
// CT_G233_GEO (default kunal761; gates/pairs runs it at kunal761 and se), and it COUNTS THE REQUESTS:
//  TC-R396 (a) DENOMINATOR the first review asked api.chess.com for both players (the harness refuses every such request, lib BLOCK);
//          (b) ct_country then holds no entry for either player; (c) the review left and opened again ASKS AGAIN - two new requests, one
//          per player - which is the job's "the next review asks again" measured rather than inferred; (d) and still stores nothing.
//  TC-R397 at the review's ply 0, names found by WHAT THEY SAY (#432's rule; no data-ct hook of the fix): (a) unseeded, no flag picture
//          in the two player bars; (b) seeded 'us' (lowercase) and 'DE': exactly two flag pictures, alt US and DE, each loaded; (c) each
//          player's name moves right by its own flag's width plus its row's computed gap, in the same bar; (d) a seeded answer is used -
//          no lookup is sent for either player; (e) seeded 'USA' and '1A': no flag, neither name moves.
// The flag is a picture (flags/<key>.png) since #550 his report (b); it counts only when it loaded (naturalWidth > 0).
const L=require('../lib');
const GEO=process.env.CT_G233_GEO||'kunal761';
const PGN='[Event "Opera Game"] [Site "Chess.com"] [Date "1858.11.02"] [White "Morphy"] [Black "Duke Karl / Count Isouard"] [Result "1-0"] 1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const NAMES={w:'Morphy',b:'Duke Karl / Count Isouard'};
const KEYS=['cc:morphy','cc:duke karl / count isouard'];
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);

L.run(async()=>{
  const tag=GEO+': ';
  const b=await L.launch({geo:GEO,name:'g233-'+GEO,store:{ct_pool:'3',ct_evalgraph:'0'}});
  const reqs=[];b.page.on('request',r=>{const m=/api\.chess\.com\/pub\/player\/([^/?#]+)$/.exec(r.url());if(m)reqs.push(decodeURIComponent(m[1]));});
  await b.open();
  const who=(from)=>{const s=reqs.slice(from);return {morphy:s.filter(u=>u==='morphy').length,duke:s.filter(u=>u==='duke karl / count isouard').length};};
  const review=async(start)=>{await b.tile('Review');await b.page.locator('textarea').first().fill(PGN);await b.tapText(/^⚡ Analyze [Gg]ame$/,{wait:200});
    let s=true;try{await b.page.locator('[data-ct="rev-summary"]').waitFor({state:'visible',timeout:90000});}catch(e){s=false;}
    await b.settle(1500);if(s&&start){await b.tapText(/^Start review/,{wait:900});await b.settle(600);}return s;};
  const cache=()=>b.page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ct_country')||'{}');}catch(e){return {bad:true};}});
  const readBars=()=>b.page.evaluate((NAMES)=>{const out={flags:[],names:{}};
    for(const sel of ['[data-ct="pbar-top"]','[data-ct="pbar-bottom"]']){const bar=document.querySelector(sel);if(!bar)continue;
      const tw=document.createTreeWalker(bar,NodeFilter.SHOW_TEXT);let n;
      while((n=tw.nextNode())){const t=(n.nodeValue||'').trim();if(!t)continue;const rg=document.createRange();rg.selectNodeContents(n);const r=rg.getBoundingClientRect();
        for(const k of Object.keys(NAMES))if(t===NAMES[k])out.names[k]={x:r.x,y:r.y,bar:sel};}
      bar.querySelectorAll('img').forEach(im=>{const r=im.getBoundingClientRect();const src=im.getAttribute('src')||'';if(!/flags\//.test(src))return;if(!(r.width>0&&im.complete&&im.naturalWidth>0))return;
        const row=im.parentElement;const gap=row?parseFloat(getComputedStyle(row).columnGap):NaN;out.flags.push({t:im.getAttribute('alt')||'',x:r.x,w:r.width,h:r.height,bar:sel,gap});});}
    return out;},NAMES);
  const reopen=async(cc)=>{await b.page.evaluate((cc)=>{if(cc==null)localStorage.removeItem('ct_country');else localStorage.setItem('ct_country',JSON.stringify(cc));},cc);await b.open();return review(true);};

  // TC-R396: visit 1, nothing stored, the harness refuses api.chess.com
  const k0=await b.page.evaluate(()=>localStorage.getItem('ct_country'));
  const ok1=await review(false);const w1=who(0);const c1=await cache();
  L.say(ok1&&k0==null&&w1.morphy>=1&&w1.duke>=1,tag+'TC-R396 DENOMINATOR the first review reached its summary with nothing stored and ASKED chess.com for both players (Morphy '+w1.morphy+', Duke Karl '+w1.duke+' requests, all refused by the harness)',{ok1,k0,w1});
  L.say(!c1.bad&&!has(c1,KEYS[0])&&!has(c1,KEYS[1]),tag+'TC-R396 the refused lookups are not stored: ct_country holds no entry for either player',c1);
  // visit 2: leave the review (reload) and open it again
  const n1=reqs.length;await b.open();const ok2=await review(false);const w2=who(n1);const c2=await cache();
  L.say(ok2&&w2.morphy>=1&&w2.duke>=1,tag+'TC-R396 the review left and opened again ASKS AGAIN for both players (Morphy '+w2.morphy+', Duke Karl '+w2.duke+' new requests) - a refused lookup is retried, not remembered',{ok2,w2});
  L.say(!c2.bad&&!has(c2,KEYS[0])&&!has(c2,KEYS[1]),tag+'TC-R396 and after the second refusal ct_country still holds no entry for either player',c2);

  // TC-R397: the flags, at ply 0 of the review
  const okU=await reopen(null);const un=await readBars();
  L.say(okU&&!!un.names.w&&!!un.names.b&&un.flags.length===0,tag+'TC-R397 PRECONDITION unseeded: both names are found by their text in the player bars and no flag picture paints',un);
  const n2=reqs.length;const okS=await reopen({[KEYS[0]]:'us',[KEYS[1]]:'DE'});const se=await readBars();const w3=who(n2);
  const want={w:'US',b:'DE'};
  L.say(okS&&se.flags.length===2&&se.flags.some(f=>f.t===want.w)&&se.flags.some(f=>f.t===want.b),tag+'TC-R397 seeded us and DE: EXACTLY TWO flag pictures load in the player bars, US (from lowercase us) and DE',{flags:se.flags.map(f=>[f.t,Math.round(f.w*10)/10,f.bar])});
  for(const k of ['w','b']){const f=se.flags.find(x=>x.t===want[k]);const d=(se.names[k]&&un.names[k])?se.names[k].x-un.names[k].x:null;
    L.say(!!f&&d!=null&&d>=10&&isFinite(f.gap)&&Math.abs(d-(f.w+f.gap))<=1.5&&se.names[k].bar===f.bar,tag+'TC-R397 seeded: '+NAMES[k]+'\'s name moves right by its own flag\'s width plus its row\'s gap ('+(d==null?'?':Math.round(d*10)/10)+'px, flag '+(f?Math.round(f.w*10)/10:'?')+'px + gap '+(f?f.gap:'?')+'px), in the same bar',{d,flag:f,name:se.names[k],was:un.names[k]});}
  L.say(okS&&w3.morphy===0&&w3.duke===0,tag+'TC-R397 a stored answer is used: no lookup is sent for either seeded player ('+(w3.morphy+w3.duke)+' requests)',w3);
  const okR=await reopen({[KEYS[0]]:'USA',[KEYS[1]]:'1A'});const rj=await readBars();
  const dR=['w','b'].map(k=>(rj.names[k]&&un.names[k])?Math.abs(rj.names[k].x-un.names[k].x):99);
  L.say(okR&&rj.flags.length===0&&dR.every(d=>d<0.6),tag+'TC-R397 seeded USA and 1A, not two-letter codes: NO flag paints and neither name moves ('+dR.map(d=>Math.round(d*10)/10).join(', ')+'px)',{flags:rj.flags,dR});
  L.say(b.errs.filter(e=>!/RuntimeError: unreachable/.test(e)).length===0,tag+'TC-R396 no app error beyond the allowed engine trap',b.errs.slice(0,3));
  await b.close();
},'233-country-lookup-failure-is-not-an-answer');
