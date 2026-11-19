'use strict';
// gates/regress/126-scanboard-server.js - THE scanBoard SERVER FUNCTION ANSWERS THE CLIENT'S CONTRACT. US-R134 / TC-R202a..g.
//
// WHY [#550 item (32), jobs/scan-orientation-double-check]: the client (chess.jsx scanBoardFile) calls the callable `scanBoard` twice per
// photo, as shot and turned 180 degrees, and needs {fen} for a read, {fen:null, ok:false, reason} for an honest refusal, and the
// 'unauthenticated' message for a signed-out call. The function was specified at jobs/build-spec-board-scan-server and never written
// into functions/index.js; it is there now, NOT deployed (the vision key is Kunal's).
// WHAT IT READS: functions/index.js in plain Node, with firebase-functions replaced by a stand-in module (onCall returns its handler, so
// the handler is called directly) and fetch replaced by a stand-in that returns a Gemini-shaped reply and records the request. No network,
// no key, no emulator. KNOW ITS LIMIT: this proves the function's own logic and its request; whether the vision model reads a real board
// is his phone check after the deploy.
// CONTROL-RECORD: ee833ef 2026-11-12 total=9 red=1 scope=env:CT_FN_SRC=spec-prompt how=#550 item (32): functions/index.js with the spec's own prompt (refuses an unknown orientation) - TC-R202d red alone
// CONTROL-RECORD: ee833ef 2026-11-12 total=1 red=1 scope=env:CT_FN_SRC=pre-scanboard how=#550 item (32): functions/index.js before scanBoard - the precondition red, nothing else runs
// CONTROL-RECORD: a78020c 2026-11-19 total=18 red=1 scope=pairs:functions-run-on-node-22-because-node-20-was-retired-2026-11-16 how=batch 13: functions/package.json with engines.node "20", and again with engines removed - TC-R202h red alone in each
const L=require('../lib');
const path=require('path');
const Module=require('module');
const SRC=process.env.CT_FN_SRC||path.join(__dirname,'..','..','functions','index.js');
L.run(async()=>{
  const orig=Module._load;
  Module._load=function(r,...a){if(r.startsWith('firebase-functions'))return {onRequest:(o,f)=>f,onCall:(o,f)=>({opts:o,fn:f}),
    HttpsError:class extends Error{constructor(c,m){super(m);this.code=c;}},defineSecret:()=>({value:()=>'test-key'}),defineString:()=>({value:()=>''}),info(){},warn(){},error(){}};
    // #550 lead: 451ae2d (the security batch) made functions/index.js require firebase-admin at load (the feedback relay's
    // auth and per-uid limit), and this container has no functions/node_modules, so the gate went red at its PRECONDITION in the
    // final suite. Stubbed like firebase-functions above; scanBoard itself does not touch it.
    if(r==='firebase-admin')return {apps:[],initializeApp(){},auth:()=>({verifyIdToken:async()=>({uid:'u'})}),
      firestore:()=>({collection:()=>({doc:()=>({})}),runTransaction:async f=>f({get:async()=>({exists:false,data:()=>({})}),set(){}})})};
    return orig.call(this,r,...a);};
  let m=null;try{m=require(SRC);}catch(e){L.say(false,'TC-R202 PRECONDITION functions/index.js loads ('+String(e.message).slice(0,120)+')');return;}
  finally{Module._load=orig;}
  L.say(!!m.scanBoard&&typeof m.scanBoard.fn==='function'&&!!m.feedbackRelay,'TC-R202 PRECONDITION functions/index.js exports a CALLABLE scanBoard beside feedbackRelay (the client reaches it with httpsCallable, not fetch)',m&&Object.keys(m));
  if(!m.scanBoard)return;
  const o=m.scanBoard.opts||{};
  L.say(o.region==='us-central1','TC-R202a it is deployed to us-central1, the region getFunctions(app) calls with no argument ('+o.region+')');
  let last=null;const reply=(x)=>{global.fetch=async(u,init)=>{last={u,body:JSON.parse(init.body)};return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(x)}]}}]})};};};
  const call=async(req)=>{try{return {r:await m.scanBoard.fn(req)};}catch(e){return {e};}};
  const IMG={auth:{uid:'u'},data:{image:'QUJD'}};
  {const a=await call({data:{image:'QUJD'}});L.say(!!a.e&&a.e.code==='unauthenticated'&&a.e.message==='unauthenticated','TC-R202b a signed-out call fails with the code AND message "unauthenticated" (the client keys off both)',a.e&&{code:a.e.code,msg:a.e.message});
   const b=await call({auth:{uid:'u'},data:{}});L.say(!!b.e&&b.e.code==='invalid-argument','TC-R202b a call with no image is refused as invalid-argument',b.e&&b.e.code);}
  reply({confident:true,fen:'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',orientation:'white-bottom',reason:''});
  {const a=await call(IMG);L.say(!!a.r&&a.r.ok===true&&a.r.fen==='rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1','TC-R202c a confident read returns {ok:true, fen} with the tail fields repaired by fen.js, not invented by the model ('+(a.r&&a.r.fen)+')',a.r);
   const t=last&&last.body&&last.body.contents[0].parts[0].text||'';const img=last&&last.body.contents[0].parts[1];
   L.say(!!img&&img.inline_data&&img.inline_data.data==='QUJD'&&img.inline_data.mime_type==='image/jpeg','TC-R202c the photo is sent as the JPEG the client made, unaltered',img);
   L.say(/assume White sits at the BOTTOM/.test(t)&&!/cannot tell the orientation/.test(t),'TC-R202d the prompt reads an unknown orientation as White at the bottom instead of refusing, so the client\'s two readings (as shot, turned) can disagree and the player is asked');}
  reply({confident:false,fen:'',orientation:'unknown',reason:'A hand covers the bottom two ranks.'});
  {const a=await call(IMG);L.say(!!a.r&&a.r.ok===false&&a.r.fen===null&&a.r.reason==='A hand covers the bottom two ranks.','TC-R202e an honest refusal is a successful call {fen:null, ok:false, reason} carrying the model\'s reason, not an error',a.r||a.e&&a.e.message);}
  reply({confident:true,fen:'8/8/8/8/8/8/8/8',orientation:'white-bottom',reason:''});
  {const a=await call(IMG);L.say(!!a.r&&a.r.ok===false&&a.r.reason==='invalid-position','TC-R202e a confident read that is not a legal position (no kings) is refused as invalid-position, never handed to the player',a.r);}
  // ── TC-R202f/g [#551 batch 12, jobs/the-board-scan-asks-for-gemini-3-8-flash-2026-11-17]: Google retired gemini-2.5-flash for new
  // users (404 NOT_FOUND on 16 and 17 Nov 2026) and Kunal deployed a hotfix by hand; main must match it, or a deploy from main undoes it.
  reply({confident:true,fen:'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',orientation:'white-bottom',reason:''});
  {await call(IMG);const u=last&&last.u||'';const gc=last&&last.body&&last.body.generationConfig||{};
   L.say(/\/v1beta\/models\/gemini-3\.8-flash:generateContent$/.test(u),'TC-R202f the request asks for gemini-3.8-flash, the model Google serves to new users ('+u.replace(/^.*\/models\//,'')+')',u);
   L.say(!('temperature' in gc)&&!('topP' in gc)&&!('topK' in gc),'TC-R202f and carries no sampling setting (no temperature, topP or topK), as the Gemini 3.8 migration notes say ('+JSON.stringify(Object.keys(gc))+')',gc);
   L.say(gc.responseMimeType==='application/json'&&!!gc.responseSchema,'TC-R202f and keeps the JSON reply and its schema',{mime:gc.responseMimeType,schema:!!gc.responseSchema});
   const src=require('fs').readFileSync(SRC,'utf8');const tm=/const GEMINI_TIMEOUT_MS = (\d+)/.exec(src);const ts=m.scanBoard.opts&&m.scanBoard.opts.timeoutSeconds;
   L.say(!!tm&&+tm[1]===50000&&ts===60&&+tm[1]<ts*1000,'TC-R202f the model gets 50 seconds (it thinks before it answers), inside the function\'s own 60 ('+(tm&&tm[1])+'ms, timeoutSeconds '+ts+')',{tm:tm&&tm[1],ts});}
  const FEN='rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR';const ANS=JSON.stringify({confident:true,fen:FEN,orientation:'white-bottom',reason:''});
  const replyParts=(parts)=>{global.fetch=async(u,init)=>{last={u,body:JSON.parse(init.body)};return {ok:true,json:async()=>({candidates:[{content:{parts}}]})};};};
  for(const [name,parts] of [['in one part',[{text:ANS}]],['split over three parts',[{text:ANS.slice(0,17)},{text:ANS.slice(17,40)},{text:ANS.slice(40)}]],
      ['with a thought part first',[{thought:true,text:'The board is photographed from White\'s side; the e-pawn has moved.'},{text:ANS}]],
      ['with thought parts around a split answer',[{thought:true,text:'{"confident":false}'},{text:ANS.slice(0,30)},{thought:true,text:'checking rank 2'},{text:ANS.slice(30)}]]]){
    replyParts(parts);const a=await call(IMG);
    L.say(!!a.r&&a.r.ok===true&&a.r.fen===FEN+' w KQkq - 0 1','TC-R202g the reply reader keeps only the answer text, '+name+' ('+(a.r?(a.r.fen||a.r.reason):(a.e&&a.e.message))+')',a.r||(a.e&&a.e.message));}
  // ── TC-R202h [batch 13, jobs/functions-run-on-node-22-because-node-20-was-retired-2026-11-16]: Google decommissioned Node.js 20 on
  // 2026-10-30 and a deploy on it stops. The repository must name the runtime the deployed functions use. Read from the tree the gate
  // runs in (not CT_FN_SRC), no browser. Node.js 22 is deprecated 2027-04-30; 24 is the next step (functions/README.md).
  {let eng=null,err='';try{eng=(JSON.parse(require('fs').readFileSync(path.join(__dirname,'..','..','functions','package.json'),'utf8')).engines||{}).node;}catch(e){err=String(e.message).slice(0,80);}
   L.say(eng==='22','TC-R202h functions/package.json says engines.node "22", the runtime Google still deploys ('+(eng===undefined?'no engines.node':eng===null?'unreadable '+err:eng)+')',eng);}
},'126-scanboard-server');
