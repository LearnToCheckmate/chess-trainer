// gates/drive/sweep.js - THE SWEEP OVER EVERY DRIVE STATE [#553, jobs/the-sweep-reaches-the-9-screens-it-missed-2026-11-17]. Runs each
// state of gates/drive/{home,menu,lesson,play,puzzles,review}.js on the bundle under test, at each geometry, in each skin, in a FRESH launch
// per state (a state may leave the store changed - a lesson's progress, a Daily 3 - so no state inherits another's), and reports one line per
// run. The overnight contrast sweep of 16 Nov 2026 (claude/TESTS-2026-11-16/setup/shots.js in the Chess App project, never committed here)
// walked these same states and could not reach 10 of them in 34 of 704 runs; this is the runner in the repository that says so by itself.
//
//   node gates/drive/sweep.js                                  every state, kunal761 and se, Classic and Playful
//   CT_SWEEP_STATES=home.home-style,menu.feedback-menu node gates/drive/sweep.js     only those (module.state, comma separated)
//   CT_SWEEP_GEOS=kunal761  CT_SWEEP_SKINS=classic  CT_APP=<bundle>  CT_SWEEP_TIMEOUT=<ms per state, default 90000>
//
// THE SKINS. Classic is the default skin and needs nothing. Playful is a Pro skin, so its runs launch with lib's opts.pro (a stand-in
// subscriber, SIGNED IN) and ct_skin set to Playful's index in SKINS (read from chess.jsx, never hard-coded). A state a module lists in
// `signedOut` (the Sign in row of the menu, which a signed-in player does not have) cannot exist in a signed-in skin; its Playful runs are
// reported as N/A with that reason, counted apart, and never credited as reached. Every other run is OK or FAIL.
// EXIT: 0 when no run failed, 1 when any failed, 2 when nothing ran. The last line is 'SWEEP TOTAL runs=N ok=K fail=F na=A'.
const L=require('../lib');const fs=require('fs'),path=require('path');
const MODS=['home','menu','lesson','play','puzzles','review'];
const src=fs.readFileSync(path.join(L.ROOT,'chess.jsx'),'utf8');
const skinIdx=(key)=>{const a=src.indexOf('const SKINS=[');const keys=[...src.slice(a,src.indexOf('\n];',a)).matchAll(/\{ key:'([a-z]+)'/g)].map(m=>m[1]);const i=keys.indexOf(key);if(i<0)throw new Error('no skin '+key+' in SKINS ('+keys.join(',')+')');return i;};
const SKIN={classic:{store:{ct_skin:String(skinIdx('classic'))},pro:false},playful:{store:{ct_skin:String(skinIdx('playful'))},pro:true}};
const list=(e,d)=>(process.env[e]||d).split(',').map(s=>s.trim()).filter(Boolean);
const GEOS=list('CT_SWEEP_GEOS','kunal761,se'),SKINS=list('CT_SWEEP_SKINS','classic,playful');const TMO=parseInt(process.env.CT_SWEEP_TIMEOUT||'90000',10);
const want=process.env.CT_SWEEP_STATES?new Set(list('CT_SWEEP_STATES','')):null;
const todo=[];
for(const m of MODS){const M=require('./'+m);const S=M.states||{};for(const s of Object.keys(S)){const id=m+'.'+s;if(!want||want.has(id))todo.push({m,s,id,fn:S[s],signedOut:(M.signedOut||[]).includes(s)});}}
if(want)for(const id of want)if(!todo.some(t=>t.id===id)){console.log('SWEEP UNKNOWN '+id+' (no such module.state)');process.exitCode=2;}
const withTimeout=(p,ms,what)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error(what+': timed out after '+ms+' ms')),ms))]);
(async()=>{
  let ok=0,fail=0,na=0;const fails=[];const t0=Date.now();
  console.log('SWEEP '+todo.length+' states x '+GEOS.length+' geometries x '+SKINS.length+' skins = '+(todo.length*GEOS.length*SKINS.length)+' runs on '+(process.env.CT_APP||'app.js'));
  for(const geo of GEOS)for(const sk of SKINS){const K=SKIN[sk];if(!K)throw new Error('unknown skin '+sk);
    for(const t of todo){const tag=geo+' '+sk+' '+t.id;
      if(t.signedOut&&K.pro){na++;console.log('SWEEP N/A  '+tag+' - a signed-out state; the '+sk+' runs are signed in (Pro stand-in)');continue;}
      let b=null;const ts=Date.now();
      try{b=await L.launch({geo,name:'sweep',store:K.store,pro:K.pro});await b.open();await withTimeout(t.fn(b),TMO,t.id);
        const skinNow=await b.page.evaluate(()=>{try{return localStorage.getItem('ct_skin');}catch(e){return null;}});
        if(skinNow!==K.store.ct_skin)throw new Error('the run left the '+sk+' skin (ct_skin '+skinNow+')');
        ok++;console.log('SWEEP OK   '+tag+' ('+Math.round((Date.now()-ts)/1000)+' s)');}
      catch(e){fail++;const msg=String(e&&e.message||e).split('\n')[0].slice(0,200);fails.push(tag+': '+msg);console.log('SWEEP FAIL '+tag+' - '+msg);}
      finally{if(b)try{await b.close();}catch(e){}}}}
  for(const f of fails)console.log('SWEEP FAILED '+f);
  console.log('SWEEP TOTAL runs='+(ok+fail+na)+' ok='+ok+' fail='+fail+' na='+na+' ('+Math.round((Date.now()-t0)/60000)+' min)');
  process.exit(fail?1:(ok+fail+na)===0?2:(process.exitCode||0));
})().catch(e=>{console.log('SWEEP ERROR '+(e&&e.stack||e));process.exit(2);});
