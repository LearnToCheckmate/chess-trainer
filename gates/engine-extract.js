// gates/engine-extract.js  —  #443
// Load the PURE chess engine out of chess.jsx into plain Node, with no browser and no React.
//
// WHY THIS EXISTS, and why it is not another copy of the engine. The brilliancy measurement
// (jobs/brilliant-gate-cannot-fire-on-a-non-sacrifice-only-move-2026-09-30) has to run the SHIPPED
// brilliantGate over real games and compare it against a candidate. Re-implementing the gate in the
// harness would measure the harness; this reads the real declarations out of chess.jsx by balanced
// braces, exactly as gates/unit-drill-why.js does, so the thing under test IS the thing that ships.
//
// THE RULE IT OBEYS, from CLAUDE.md: "a harness that substitutes the thing under test silently will be
// believed." So this module exports `SOURCE_MD5` and every caller prints it. If a run's output does
// not say which chess.jsx it read, it is not evidence.
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const SRC_PATH=process.env.CT_SRC||path.join(__dirname,'..','chess.jsx');
const src=fs.readFileSync(SRC_PATH,'utf8');
const SOURCE_MD5=crypto.createHash('md5').update(src).digest('hex').slice(0,12);

// Split chess.jsx into top-level declaration blocks: a block starts at a line beginning with
// [async] function/const/let/var at column 0 and runs to the line before the next such line.
// #545 item (91) [jobs/the-grading-helpers-moved-and-the-extraction-instrument-did-not-so-e-classify-throws-on-main-
// 2026-10-08]: `async function` did not start a block, so a top-level async function was absorbed into the body of the
// declaration above it (the job measured analyzeGameCounts swallowed into isBrilliant's block).
const lines=src.split('\n');
const starts=[];
for(let i=0;i<lines.length;i++) if(/^(async\s+function|function|const|let|var)\s/.test(lines[i])) starts.push(i);
const blocks=new Map();   // name -> {text, order}
for(let s=0;s<starts.length;s++){
  const a=starts[s], b=(s+1<starts.length?starts[s+1]:lines.length);
  const m=/^(?:async\s+function|function|const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(lines[a]);
  if(!m) continue;
  if(!blocks.has(m[1])) blocks.set(m[1],{text:lines.slice(a,b).join('\n'),order:a});
}
function need(names){
  const miss=names.filter(n=>!blocks.has(n));
  if(miss.length) throw new Error('engine-extract: not found in '+SRC_PATH+': '+miss.join(', '));
  return names.map(n=>blocks.get(n)).sort((x,y)=>x.order-y.order).map(b=>b.text).join('\n');
}

// The pure engine, in source order. OPENINGS (chess.jsx:203) is deliberately NOT here: it reads
// window.CTLESSONS and nothing below needs it.
const NAMES=['FILES','rc2sq','inB','opp','initBoard','initGame','fromFEN','toFEN','cloneB','isAttacked','findKing','isInCheck','pseudoMoves',
  'applyMove','getLegal','getMovesFrom','disambig','toSAN','makeMove','getStatus','VAL','mateW','PST',
  'evaluate','makeFast','orderMoves','QDEPTH','quiesce','minimax','evalPawns','cleanSAN','parsePGN',
  'matchSanLenient','loadSANs','rankMoves','classify','SEEVAL','seeSq','brilliantGate','isBrilliant',
  // #545 item (91): the eleven grading helpers #440 and #491 added. classify reads CLS_BANDS, so without them E.classify()
  // threw "CLS_BANDS is not defined" on every call.
  'winPct','moveAcc','winDrop','classifyByLoss','CLS_BANDS','clsByName','matesMover','mateLadder','DRILL_GRADES','drillGrade','gameAcc'];
// #545 item (91), the part that stops this recurring: a STALE LIST IS A RED, NOT A SILENCE. For every exported block, any
// identifier that is a top-level declaration of chess.jsx and is NOT in NAMES is a reference this module cannot satisfy,
// so it throws HERE, at require time, naming it - instead of a ReferenceError on first call in whatever caller hits it.
// Comments and string literals are stripped first so a name merely mentioned does not count. Measured at #545: 0 stale
// references with the 51 names below; the pre-#545 list of 40 gives classify -> CLS_BANDS (measured), and a list missing only CLS_BANDS throws naming classify and clsByName.
function staleRefs(names){
  const top=new Set(blocks.keys()), inN=new Set(names), out=[];
  const strip=t=>t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')
    .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,'""');
  for(const n of names){const b=blocks.get(n); if(!b) continue;
    for(const id of new Set(strip(b.text).match(/[A-Za-z_$][\w$]*/g)||[])) if(id!==n&&top.has(id)&&!inN.has(id)) out.push(n+' -> '+id);}
  return out;
}
// A CONTROL SOURCE MAY PREDATE A HELPER, AND THAT IS NOT THE SAME AS A STALE LIST [#546, item (16);
// jobs/gate-68-publishes-a-negative-control-against-half-its-current-size-2026-10-07]. Since #545 item (91) took the
// eleven grading helpers, a pre-fix CT_SRC (gate 68's own control is df79fb7's chess.jsx, which has none of them) threw
// at require, so a gate's documented control could not run at all. So: with CT_SRC set, a name the control source does
// not DECLARE is left out of the export and named on stderr - a caller that uses it then fails loudly on its first call,
// which is the honest answer for a control that does not have it. WITHOUT CT_SRC NOTHING CHANGES: the shipped
// chess.jsx must declare every name and need() still throws on a missing one.
const ABSENT=process.env.CT_SRC?NAMES.filter(n=>!blocks.has(n)):[];
if(ABSENT.length) process.stderr.write('engine-extract: CT_SRC '+SRC_PATH+' declares none of '+ABSENT.join(', ')+' - not exported (a control source older than those helpers)\n');
const TAKE=NAMES.filter(n=>!ABSENT.includes(n));
const STALE=staleRefs(TAKE);
if(STALE.length&&!process.env.CT_EXTRACT_ALLOW_STALE) throw new Error('engine-extract: NAMES is stale against '+SRC_PATH+' - exported blocks reference top-level declarations it does not take: '+STALE.join('; ')+'. Add them to NAMES.');
const code=need(TAKE)+'\nmodule.exports={'+TAKE.join(',')+'};';
const mod={exports:{}};
// `window` is referenced by declarations we did not take; give the sandbox a stub so a stray
// reference throws a clear error rather than a ReferenceError from nowhere.
new Function('module','window',code)(mod,{});
module.exports=Object.assign({},mod.exports,{SOURCE_MD5,SRC_PATH,NAMES:NAMES.slice(),ABSENT:ABSENT.slice(),staleRefs});
