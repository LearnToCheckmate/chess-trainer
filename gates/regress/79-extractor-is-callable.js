// gates/regress/79-extractor-is-callable.js   (SIT run 23, 2026-10-08, written for the build lane to commit;
// LANDED AT #546, batch 6 item (25), jobs/the-grading-helpers-moved-and-the-extraction-instrument-did-not-so-e-classify-
// throws-on-main-2026-10-08, from docs/sit-gate-engine-extract-stale-names-2026-10-08 - suggested as 75, numbered 79
// through claims/gate-number because 75 to 78 are taken). #545 item (91) fixed what this gate was written to catch, so
// on main every assertion is GREEN; its job now is to keep it that way. Controls, measured at #546: the extractor as it
// stood at 1507ade (#544, before that fix) reddens X1, X2, X3b and X4b, and CT_SRC=<df79fb7 chess.jsx> (a source older
// than the helpers) reddens X1 and X4a.
// CLASS: an extraction instrument whose name list has gone stale hands out a function whose body
// references something it did not bundle. Measured at dee3ce0 / chess.jsx md5 be71ee34ee76:
// E.classify(100) throws ReferenceError: CLS_BANDS is not defined, and 11 of the 11 #440/#491
// grading helpers are absent from NAMES. This gate turns that from a silence into a red.
'use strict';
const fs=require('fs'), path=require('path');
const L=require('../lib.js');
const ROOT=path.join(__dirname,'..','..');
const EEPATH=path.join(ROOT,'gates','engine-extract.js');
const SRCPATH=process.env.CT_SRC||path.join(ROOT,'chess.jsx');

(async()=>{
  const src=fs.readFileSync(SRCPATH,'utf8');
  const ee=fs.readFileSync(EEPATH,'utf8');

  // ---- X0: THE DENOMINATOR, AS ITS OWN ASSERTION AND NEVER A CONJUNCT. -----------------------
  // A sweep over an empty NAMES passes vacuously; that is the trap CLAUDE.md records eleven times
  // and the one #497's antagonist A found in gate 74's B1. So NAMES is proved non-empty first.
  const m=/const NAMES=\[([\s\S]*?)\];/.exec(ee);
  L.say(!!m, 'X0a gates/engine-extract.js declares a NAMES array');
  const NAMES=m?m[1].match(/'([^']+)'/g).map(s=>s.slice(1,-1)):[];
  L.say(NAMES.length>0, 'X0b NAMES is non-empty - it holds '+NAMES.length+' names (the denominator for X1 and X2)');

  // chess.jsx's top-level declarations, by the SAME splitter the extractor uses, plus async.
  const lines=src.split('\n'), starts=[];
  for(let i=0;i<lines.length;i++) if(/^(async\s+function|function|const|let|var)\s/.test(lines[i])) starts.push(i);
  const blocks=new Map();
  for(let s=0;s<starts.length;s++){
    const a=starts[s], b=(s+1<starts.length?starts[s+1]:lines.length);
    const mm=/^(?:async\s+function|function|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(lines[a]);
    if(mm&&!blocks.has(mm[1])) blocks.set(mm[1],lines.slice(a,b).join('\n'));
  }
  const topLevel=[...blocks.keys()];
  L.say(topLevel.length>0, 'X0c chess.jsx yields '+topLevel.length+' top-level declarations (the oracle for X1)');

  // ---- X1: NO EXPORTED NAME'S BLOCK REFERENCES A TOP-LEVEL NAME THE EXTRACTOR OMITS. ----------
  // This is the assertion that fails TODAY. Expected at dee3ce0: 1 offender, `classify` -> CLS_BANDS.
  const provided=new Set(NAMES), unsafe=[];
  for(const n of NAMES){
    const t=blocks.get(n); if(t===undefined){ unsafe.push(n+' (MISSING FROM chess.jsx)'); continue; }
    // COMMENTS AND STRING LITERALS ARE STRIPPED FIRST [#546]: the SIT draft matched identifiers in raw text, so a name
    // merely MENTIONED in a comment (isBrilliant's block names analyzeGameCounts in prose) read as a reference - three
    // false offenders on main. The strip is the one gates/engine-extract.js's own staleRefs uses, copied, not imported,
    // so this gate checks the extractor rather than trusting it.
    const strip=x=>x.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')
      .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,'""');
    const ids=new Set(strip(t).match(/[A-Za-z_$][\w$]*/g)||[]);
    const unmet=[...ids].filter(i=>i!==n && topLevel.includes(i) && !provided.has(i));
    if(unmet.length) unsafe.push(n+' -> '+unmet.join('/'));
  }
  L.say(unsafe.length===0, 'X1 every one of the '+NAMES.length+' exported names bundles everything its own block references'
        +(unsafe.length?' - OFFENDERS: '+unsafe.join('; '):''));

  // ---- X2: EVERY EXPORTED FUNCTION IS CALLABLE. Executed, not read. --------------------------
  // Arity-zero-safe invocation: a TypeError from bad arguments is fine, a ReferenceError is not.
  const E=require(EEPATH);
  const threw=[];
  for(const n of NAMES){
    if(typeof E[n]!=='function') continue;
    try{ E[n](); }
    catch(e){ if(e instanceof ReferenceError) threw.push(n+': '+e.message); }
  }
  L.say(threw.length===0, 'X2 no exported function raises a ReferenceError when called'
        +(threw.length?' - THREW: '+threw.join('; '):''));

  // ---- X3: THE SPLITTER SEES async function. -------------------------------------------------
  // Expected at dee3ce0: RED. chess.jsx has 2 (fetchCountry, analyzeGameCounts) and the shipped
  // regex /^(function|const|let|var)\s/ cannot start a block on either, so each is absorbed.
  const asyncNames=[...src.matchAll(/^async function ([A-Za-z_$][\w$]*)/gm)].map(x=>x[1]);
  L.say(asyncNames.length>0, 'X3a chess.jsx has '+asyncNames.length+' top-level async functions ('+asyncNames.join(', ')+') - the denominator for X3b');
  const re=/const starts=\[\][\s\S]{0,400}?\/\^\(([^)]*)\)/.exec(ee);
  const hasAsync=/async/.test(ee.slice(ee.indexOf('const starts'), ee.indexOf('const starts')+400));
  L.say(hasAsync, 'X3b the extractor\'s block-start regex admits `async function`, so an async top-level declaration starts its own block instead of being absorbed into the one above it');

  // ---- X4: AND THE #440/#491 GRADING HELPERS ARE REACHABLE. ----------------------------------
  const WANT=['winPct','moveAcc','winDrop','classifyByLoss','CLS_BANDS','clsByName','matesMover','mateLadder','DRILL_GRADES','drillGrade','gameAcc'];
  const present=WANT.filter(w=>blocks.has(w));
  L.say(present.length===WANT.length, 'X4a all '+WANT.length+' named grading helpers exist in chess.jsx (denominator check; if one was renamed this gate must be updated, not the app)');
  const missing=present.filter(w=>!provided.has(w));
  L.say(missing.length===0, 'X4b every grading helper chess.jsx defines is exported by the extractor'
        +(missing.length?' - NOT CARRIED: '+missing.join(', '):''));
  L.done('79-extractor-is-callable');
})().catch(e=>{L.say(false,'harness threw: '+((e&&e.stack)||e).toString().split('\n').slice(0,3).join(' | '));L.done('79-extractor-is-callable');});
